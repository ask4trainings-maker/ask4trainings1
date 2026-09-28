import yaml
from yaml.constructor import ConstructorError

def no_duplicates_constructor(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        value = loader.construct_object(value_node, deep=deep)
        if key in mapping:
            print(f"Duplicate key found: {key}")
        mapping[key] = value
    return loader.construct_mapping(node, deep)

yaml.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, no_duplicates_constructor, Loader=yaml.SafeLoader)

with open('public/admin/config.yml', 'r') as f:
    yaml.safe_load(f)
print("Duplicate check done.")
