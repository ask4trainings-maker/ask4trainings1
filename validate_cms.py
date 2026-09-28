import yaml

with open('public/admin/config.yml', 'r') as f:
    config = yaml.safe_load(f)

errors = []

def check_fields(fields, path=""):
    if not isinstance(fields, list):
        errors.append(f"{path}: 'fields' must be a list, found {type(fields)}")
        return
    for i, field in enumerate(fields):
        field_path = f"{path}[{i}]"
        if not isinstance(field, dict):
            errors.append(f"{field_path}: is not a dictionary")
            continue
        if 'name' not in field:
            errors.append(f"{field_path}: missing 'name'")
        if 'widget' not in field:
            if 'fields' not in field and 'field' not in field:
                errors.append(f"{field_path} ({field.get('name')}): missing 'widget' and no sub-fields")
        
        widget = field.get('widget', 'string')
        if widget in ['object', 'list']:
            if 'fields' not in field and 'field' not in field:
                errors.append(f"{field_path} ({field.get('name')}): widget '{widget}' requires 'fields' or 'field'")
            if 'fields' in field:
                check_fields(field['fields'], f"{field_path}.fields")
            elif 'field' in field:
                if not isinstance(field['field'], dict):
                    errors.append(f"{field_path}.field: must be a dictionary")
                else:
                    check_fields([field['field']], f"{field_path}.field")

for collection in config.get('collections', []):
    col_name = collection.get('name', 'Unknown')
    
    if 'files' in collection:
        for file_item in collection['files']:
            file_name = file_item.get('name', 'Unknown')
            if 'fields' in file_item:
                check_fields(file_item['fields'], f"Collection {col_name} -> File {file_name}")
            else:
                errors.append(f"Collection {col_name} -> File {file_name} is missing 'fields'")
    else:
        if 'fields' in collection:
            check_fields(collection['fields'], f"Collection {col_name}")
        else:
             errors.append(f"Collection {col_name} is missing 'fields'")

for e in errors:
    print(e)
if not errors:
    print("Validation passed.")
