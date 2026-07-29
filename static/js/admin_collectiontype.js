document.addEventListener('DOMContentLoaded', function() {
    const subcategorySelect = document.getElementById('id_subcategory');
    const collectionTypeSelect = document.getElementById('id_collection_type');

    if (subcategorySelect && collectionTypeSelect) {
        function updateCollectionTypes(subcategoryId, selectedCollectionTypeId = null) {
            if (!subcategoryId) {
                collectionTypeSelect.innerHTML = '<option value="">---------</option>';
                return;
            }

            const url = `/admin/SoulStoneAPP/product/ajax/load-collection-types/?subcategory_id=${subcategoryId}`;
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    // Keep track of what was selected
                    const currentSelected = selectedCollectionTypeId || collectionTypeSelect.value;

                    collectionTypeSelect.innerHTML = '<option value="">---------</option>';
                    data.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name;
                        if (currentSelected && item.id == currentSelected) {
                            option.selected = true;
                        }
                        collectionTypeSelect.appendChild(option);
                    });
                })
                .catch(error => console.error('Error fetching collection types:', error));
        }

        // Add event listener for subcategory selection change
        subcategorySelect.addEventListener('change', function() {
            updateCollectionTypes(this.value);
        });

        // Run initially on load to filter correctly if a subcategory is already selected
        const initialSubcategoryId = subcategorySelect.value;
        const initialCollectionTypeId = collectionTypeSelect.value;
        if (initialSubcategoryId) {
            updateCollectionTypes(initialSubcategoryId, initialCollectionTypeId);
        }
    }
});
