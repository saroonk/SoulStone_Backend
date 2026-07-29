document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('id_category');
    const subcategorySelect = document.getElementById('id_subcategory');
    
    if (categorySelect && subcategorySelect) {
        function updateSubcategories(categoryId, selectedSubcategoryId = null) {
            if (!categoryId) {
                subcategorySelect.innerHTML = '<option value="">---------</option>';
                return;
            }
            
            const url = `/ajax/load-subcategories/?category_id=${categoryId}`;
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    // Keep track of what was selected
                    const currentSelected = selectedSubcategoryId || subcategorySelect.value;
                    
                    subcategorySelect.innerHTML = '<option value="">---------</option>';
                    data.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name;
                        if (currentSelected && item.id == currentSelected) {
                            option.selected = true;
                        }
                        subcategorySelect.appendChild(option);
                    });
                })
                .catch(error => console.error('Error fetching subcategories:', error));
        }

        // Add event listener for category selection change
        categorySelect.addEventListener('change', function() {
            updateSubcategories(this.value);
        });

        // Run initially on load to filter correctly if a category is already selected
        const initialCategoryId = categorySelect.value;
        const initialSubcategoryId = subcategorySelect.value;
        if (initialCategoryId) {
            updateSubcategories(initialCategoryId, initialSubcategoryId);
        }
    }
});
