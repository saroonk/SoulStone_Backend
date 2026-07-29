from django.db import migrations
from django.utils.text import slugify

def populate_subcategories(apps, schema_editor):
    Category = apps.get_model('SoulStoneAPP', 'Category')
    SubCategory = apps.get_model('SoulStoneAPP', 'SubCategory')
    Product = apps.get_model('SoulStoneAPP', 'Product')
    
    db_alias = schema_editor.connection.alias
    
    # Loop over categories and create a default SubCategory for each
    for category in Category.objects.using(db_alias).all():
        sub_name = f"Default {category.name}"
        sub_slug = slugify(sub_name)
        
        # Ensure slug is unique
        orig_slug = sub_slug
        counter = 1
        while SubCategory.objects.using(db_alias).filter(slug=sub_slug).exists():
            sub_slug = f"{orig_slug}-{counter}"
            counter += 1
            
        subcat, _ = SubCategory.objects.using(db_alias).get_or_create(
            category=category,
            name=sub_name,
            defaults={'slug': sub_slug}
        )
        
        # Assign to products of this category
        Product.objects.using(db_alias).filter(category=category, subcategory__isnull=True).update(subcategory=subcat)

def reverse_populate_subcategories(apps, schema_editor):
    SubCategory = apps.get_model('SoulStoneAPP', 'SubCategory')
    Product = apps.get_model('SoulStoneAPP', 'Product')
    db_alias = schema_editor.connection.alias
    
    Product.objects.using(db_alias).update(subcategory=None)
    SubCategory.objects.using(db_alias).all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('SoulStoneAPP', '0010_subcategory_product_subcategory'),
    ]

    operations = [
        migrations.RunPython(populate_subcategories, reverse_populate_subcategories),
    ]
