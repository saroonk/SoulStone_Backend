from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils.text import slugify
from .models import Category, SubCategory, Product


class SubCategoryTests(TestCase):
    def setUp(self):
        self.cat1 = Category.objects.create(name="Bracelets", slug="bracelets")
        self.cat2 = Category.objects.create(name="Rings", slug="rings")
        self.dummy_image = SimpleUploadedFile('test.jpg', b'file_content', content_type='image/jpeg')

    def test_subcategory_creation_and_slug(self):
        subcat = SubCategory.objects.create(category=self.cat1, name="Tiger Eye Bracelet")
        self.assertEqual(subcat.slug, slugify("Tiger Eye Bracelet"))
        self.assertEqual(str(subcat), "Tiger Eye Bracelet")

    def test_subcategory_ordering(self):
        SubCategory.objects.create(category=self.cat1, name="Z Bracelet")
        SubCategory.objects.create(category=self.cat1, name="A Bracelet")
        subcategories = list(SubCategory.objects.all())
        self.assertEqual(subcategories[0].name, "A Bracelet")
        self.assertEqual(subcategories[1].name, "Z Bracelet")

    def test_valid_product_category_subcategory(self):
        subcat = SubCategory.objects.create(category=self.cat1, name="Tiger Eye Bracelet")
        product = Product(
            category=self.cat1,
            subcategory=subcat,
            name="Premium Tiger Eye",
            slug="premium-tiger-eye",
            new_price=1000.00,
            old_price=1200.00,
            stock=10,
            main_image=self.dummy_image,
            description_and_benefits="Benefits",
            certification_authenticity="Auth",
            stone_origin="Origin"
        )
        # Should not raise any exception
        product.full_clean()

    def test_invalid_product_category_subcategory(self):
        subcat_rings = SubCategory.objects.create(category=self.cat2, name="Silver Ring")
        product = Product(
            category=self.cat1,
            subcategory=subcat_rings,
            name="Invalid Product",
            slug="invalid-product",
            new_price=1000.00,
            old_price=1200.00,
            stock=10,
            main_image=self.dummy_image,
            description_and_benefits="Benefits",
            certification_authenticity="Auth",
            stone_origin="Origin"
        )
        try:
            product.full_clean()
        except ValidationError as e:
            self.assertIn('subcategory', e.message_dict)
            self.assertIn("does not belong to the category", e.message_dict['subcategory'][0])


class AjaxSubCategoryTests(TestCase):
    def setUp(self):
        self.cat1 = Category.objects.create(name="Bracelets", slug="bracelets")
        self.subcat1 = SubCategory.objects.create(category=self.cat1, name="Tiger Eye")
        self.subcat2 = SubCategory.objects.create(category=self.cat1, name="Amethyst")

    def test_load_subcategories(self):
        from django.urls import reverse
        url = reverse('ajax_load_subcategories')
        response = self.client.get(url, {'category_id': self.cat1.id})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        # Verify ordering is alphabetical
        self.assertEqual(data[0]['name'], "Amethyst")
        self.assertEqual(data[1]['name'], "Tiger Eye")



