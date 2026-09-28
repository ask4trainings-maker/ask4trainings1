import yaml
import re

with open('public/admin/config.yml', 'r') as f:
    config = yaml.safe_load(f)

errors = []

def get_field_names(fields):
    if not isinstance(fields, list): return set()
    names = set()
    for f in fields:
        if isinstance(f, dict) and 'name' in f:
            names.add(f['name'])
    return names

def check_summary(obj, fields_set, path):
    if not isinstance(obj, dict): return
    if 'summary' in obj:
        summary = obj['summary']
        # Extract {{fields.fieldname}} or {{fieldname}}
        # e.g., {{fields.title}} -> title
        matches = re.findall(r'\{\{\s*(?:fields\.)?([a-zA-Z0-9_-]+)\s*\}\}', summary)
        for m in matches:
            # Note: Decap CMS also allows {{slug}} etc, we check fields specifically
            # Wait, `fields.value` refers to the `value` field in the current list item.
            if m not in fields_set and m not in ['slug', 'filename', 'extension', 'commit_date', 'commit_author']:
                errors.append(f"{path}: summary template refers to unknown field '{m}' in '{summary}'")

def traverse_fields(fields, path):
    if not isinstance(fields, list): return
    fields_set = get_field_names(fields)
    for i, field in enumerate(fields):
        if not isinstance(field, dict): continue
        field_path = f"{path}.{field.get('name', i)}"
        check_summary(field, get_field_names(field.get('fields', []) if 'fields' in field else ([field.get('field')] if 'field' in field else [])), field_path)
        
        if 'fields' in field:
            traverse_fields(field['fields'], field_path)
        elif 'field' in field and isinstance(field['field'], dict):
            traverse_fields([field['field']], field_path)

for collection in config.get('collections', []):
    col_name = collection.get('name', 'Unknown')
    
    # Check collection-level summary
    col_fields = get_field_names(collection.get('fields', []))
    check_summary(collection, col_fields, f"Collection {col_name}")
    
    if 'files' in collection:
        for file_item in collection['files']:
            file_name = file_item.get('name', 'Unknown')
            file_fields = get_field_names(file_item.get('fields', []))
            check_summary(file_item, file_fields, f"Collection {col_name} -> File {file_name}")
            traverse_fields(file_item.get('fields', []), f"Collection {col_name} -> File {file_name}")
    else:
        traverse_fields(collection.get('fields', []), f"Collection {col_name}")

for e in errors:
    print(e)
if not errors:
    print("All summaries are valid.")
