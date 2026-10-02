use calamine::{open_workbook, Data, Reader, Xlsx};
use std::path::Path;
use zeroize::Zeroize;

use crate::vault::{CredentialRecord, VaultError};

const EXPECTED_SHEET: &str = "Main";

pub fn import_records(
    path: &Path,
    target: &mut Vec<CredentialRecord>,
) -> Result<usize, VaultError> {
    if path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("xlsx")) != Some(true) {
        return Err(VaultError::InvalidImportPath);
    }

    let mut workbook: Xlsx<_> = open_workbook(path)
        .map_err(|error| VaultError::Excel(format!("Could not read Excel workbook: {error}")))?;

    let sheet_name = workbook
        .sheet_names()
        .into_iter()
        .find(|name| name.eq_ignore_ascii_case(EXPECTED_SHEET))
        .ok_or_else(|| VaultError::Excel("The workbook does not contain a Main sheet.".into()))?;

    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|error| VaultError::Excel(format!("Could not read the Main sheet: {error}")))?;

    let mut rows = range.rows();
    let header_row = rows
        .next()
        .ok_or_else(|| VaultError::Excel("The Main sheet is empty.".into()))?;

    let headers = header_row
        .iter()
        .map(cell_text)
        .map(|value| normalize_header(&value))
        .collect::<Vec<_>>();

    let service_index = find_header(&headers, &["socialnetwork-account", "socialnetworkaccount", "service"])
        .ok_or_else(|| VaultError::Excel("Missing service column.".into()))?;
    let username_index = find_header(&headers, &["user", "username"]);
    let email_index = find_header(&headers, &["email", "e-mail"]);
    let password_index = find_header(&headers, &["password", "pass"]);
    let status_index = find_header(&headers, &["status"]);
    let phone_index = find_header(&headers, &["phonenumberassociated", "phone", "phonenumber"]);

    let mut imported = 0usize;

    for row in rows {
        let service = cell_at(row, service_index);
        if service.trim().is_empty() {
            continue;
        }

        let username = username_index
            .map(|index| cell_at(row, index))
            .unwrap_or_default();
        let email = email_index
            .map(|index| cell_at(row, index))
            .unwrap_or_default();
        let password = password_index
            .map(|index| cell_at(row, index))
            .unwrap_or_default();

        let password = normalize_password(&password);
        let notes = imported_metadata(
            status_index.map(|index| cell_at(row, index)),
            phone_index.map(|index| cell_at(row, index)),
        );

        let mut record = CredentialRecord {
            id: String::new(),
            service: service.trim().to_string(),
            category: "Other".into(),
            username: username.trim().to_string(),
            email: email.trim().to_string(),
            url: String::new(),
            password,
            notes,
            twofa: false,
            importance: "Normal".into(),
            updated: chrono_now(),
        };

        if record.username.contains('@') && record.email.is_empty() {
            record.email = std::mem::take(&mut record.username);
        }

        if let Some(existing) = target.iter_mut().find(|existing| same_identity(existing, &record)) {
            record.id = existing.id.clone();

            if record.password.is_empty() {
                record.password = existing.password.clone();
            }
            if record.url.is_empty() {
                record.url = existing.url.clone();
            }
            if record.category == "Other" {
                record.category = existing.category.clone();
            }
            if record.importance == "Normal" {
                record.importance = existing.importance.clone();
            }
            if !record.twofa {
                record.twofa = existing.twofa;
            }
            if record.notes.is_empty() {
                record.notes = existing.notes.clone();
            }

            existing.zeroize();
            *existing = record;
        } else {
            record.id = uuid::Uuid::new_v4().to_string();
            target.push(record);
        }

        imported += 1;
    }

    Ok(imported)
}

fn find_header(headers: &[String], aliases: &[&str]) -> Option<usize> {
    headers.iter().position(|header| aliases.iter().any(|alias| header == alias))
}

fn normalize_header(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| character.is_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

fn cell_at(row: &[Data], index: usize) -> String {
    row.get(index).map(cell_text).unwrap_or_default()
}

fn cell_text(cell: &Data) -> String {
    match cell {
        Data::String(value) => value.clone(),
        Data::Int(value) => value.to_string(),
        Data::Float(value) => {
            if value.fract() == 0.0 {
                format!("{value:.0}")
            } else {
                value.to_string()
            }
        }
        Data::Bool(value) => value.to_string(),
        Data::DateTime(value) => value.to_string(),
        Data::DateTimeIso(value) => value.clone(),
        Data::DurationIso(value) => value.clone(),
        Data::Error(value) => value.to_string(),
        Data::Empty => String::new(),
    }
}

fn normalize_password(value: &str) -> String {
    if value.trim().is_empty() || value.trim().eq_ignore_ascii_case("none") {
        String::new()
    } else {
        value.trim().to_string()
    }
}

fn imported_metadata(status: Option<String>, phone: Option<String>) -> String {
    let mut metadata = Vec::new();

    if let Some(status) = status {
        if !status.trim().is_empty() {
            metadata.push(format!("Status: {}", status.trim()));
        }
    }

    if let Some(phone) = phone {
        if !phone.trim().is_empty() {
            metadata.push(format!("Phone: {}", phone.trim()));
        }
    }

    if metadata.is_empty() {
        String::new()
    } else {
        format!("Imported from Excel · {}", metadata.join(" · "))
    }
}

fn same_identity(left: &CredentialRecord, right: &CredentialRecord) -> bool {
    if left.service.trim().eq_ignore_ascii_case(right.service.trim())
        && left.username.trim().eq_ignore_ascii_case(right.username.trim())
        && left.email.trim().eq_ignore_ascii_case(right.email.trim())
        && (!left.username.trim().is_empty() || !left.email.trim().is_empty())
    {
        true
    } else {
        false
    }
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}
