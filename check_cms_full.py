import yaml

with open('public/admin/config.yml', 'r') as f:
    config = yaml.safe_load(f)

errors = []

for collection in config.get('collections', []):
    col_name = collection.get('name', 'Unknown')
    
    if 'files' in collection:
        for file_item in collection['files']:
            file_name = file_item.get('name', 'Unknown')
            fields = {f.get('name') for f in file_item.get('fields', [])}
            
            for sf in file_item.get('sortable_fields', []):
                if sf not in fields:
                    errors.append(f"File {file_name}: sortable_field '{sf}' not in fields.")
            
            for vg in file_item.get('view_groups', []):
                if vg.get('field') not in fields:
                    errors.append(f"File {file_name}: view_group field '{vg.get('field')}' not in fields.")
                    
            for vf in file_item.get('view_filters', []):
                if vf.get('field') not in fields:
                    errors.append(f"File {file_name}: view_filter field '{vf.get('field')}' not in fields.")
    else:
        fields = {f.get('name') for f in collection.get('fields', [])}
        
        for sf in collection.get('sortable_fields', []):
            if sf not in fields:
                errors.append(f"Collection {col_name}: sortable_field '{sf}' not in fields.")
        
        for vg in collection.get('view_groups', []):
            if vg.get('field') not in fields:
                errors.append(f"Collection {col_name}: view_group field '{vg.get('field')}' not in fields.")
                
        for vf in collection.get('view_filters', []):
            if vf.get('field') not in fields:
                errors.append(f"Collection {col_name}: view_filter field '{vf.get('field')}' not in fields.")
                
        # Also check search_fields
        for sf in collection.get('search_fields', []):
            if sf not in fields:
                errors.append(f"Collection {col_name}: search_field '{sf}' not in fields.")

for e in errors:
    print(e)
if not errors:
    print("No errors found.")
