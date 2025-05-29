import { getAllProducts, saveProducts, parseCSV } from './db.js';

const WEEK_FIELDS = ['A Week Quantity', 'B Week Quantity', 'C Week Quantity'];
let currentWeek = WEEK_FIELDS[0];
let isReadOnly = false;

function renderToggleButton() {
    const btn = document.createElement('button');
    btn.textContent = isReadOnly ? 'Switch to Update View' : 'Switch to Read-Only View';
    btn.onclick = () => {
        isReadOnly = !isReadOnly;
        main();
    };
    return btn;
}

function renderCsvUploadUI(onImport) {
    const uploadDiv = document.createElement('div');
    uploadDiv.innerHTML = `
        <input type="file" id="csv-upload" accept=".csv" />
        <button id="import-csv-btn">Import CSV</button>
    `;

    const fileInput = uploadDiv.querySelector('#csv-upload');

    // Handle file input only
    uploadDiv.querySelector('#import-csv-btn').onclick = async () => {
        if (!fileInput.files.length) return alert('Please select a CSV file.');
        const file = fileInput.files[0];
        const text = await file.text();
        const products = parseCSV(text);
        await saveProducts(products);
        onImport(products);
    };

    return uploadDiv;
}

function renderJsonImportUI(onImport) {
    const div = document.createElement('div');
    div.innerHTML = `
        <input type="file" id="json-upload" accept=".json" />
        <button id="import-json-btn">Import JSON</button>
    `;
    const fileInput = div.querySelector('#json-upload');

    // Handle file input only
    div.querySelector('#import-json-btn').onclick = async () => {
        if (!fileInput.files.length) return alert('Please select a JSON file.');
        const file = fileInput.files[0];
        const text = await file.text();
        let products;
        try {
            products = JSON.parse(text);
        } catch (e) {
            alert('Invalid JSON');
            return;
        }
        await saveProducts(products);
        onImport(products);
    };
    return div;
}

function renderWeekDropdown(onChange) {
    const weekLabels = {
        'A Week Quantity': 'Week A',
        'B Week Quantity': 'Week B',
        'C Week Quantity': 'Week C'
    };
    const select = document.createElement('select');
    WEEK_FIELDS.forEach(week => {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = weekLabels[week] || week;
        select.appendChild(option);
    });
    select.value = currentWeek;
    select.onchange = (e) => {
        currentWeek = e.target.value;
        onChange(currentWeek);
    };
    return select;
}

async function renderUpdateTable(products) {
    // Sort products by numeric value of "House Location"
    products = products.slice().sort((a, b) => {
        const locA = parseInt(a['House Location'], 10) || 0;
        const locB = parseInt(b['House Location'], 10) || 0;
        return locA - locB;
    });

    // Filter products by current week quantity > 0
    const filtered = products.filter(p => (parseInt(p[currentWeek], 10) || 0) > 0);

    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '';

    appDiv.appendChild(renderToggleButton());
    appDiv.appendChild(renderCsvUploadUI((newProducts) => renderUpdateTable(newProducts)));
    appDiv.appendChild(renderWeekDropdown(() => renderUpdateTable(products)));

    // --- Add JSON Export Button ---
    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.textContent = 'Export JSON';
    exportJsonBtn.onclick = async () => {
        const allProducts = await getAllProducts();
        const json = JSON.stringify(allProducts, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products-export.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    };
    appDiv.appendChild(exportJsonBtn);
    // --- End JSON Export Button ---

    const table = document.createElement('table');
    table.id = 'update-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Name', 'In House'].forEach(field => {
        const th = document.createElement('th');
        th.textContent = field;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    filtered.forEach(product => {
        const tr = document.createElement('tr');

        // Name cell
        const tdName = document.createElement('td');
        tdName.textContent = product['Name'];
        tr.appendChild(tdName);

        // In House cell with +/-
        const tdInHouse = document.createElement('td');
        tdInHouse.className = 'in-house-edit';

        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.textContent = '−';

        const valueSpan = document.createElement('span');
        valueSpan.textContent = product['In House'];
        valueSpan.className = 'in-house-value';

        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.textContent = '+';

        minusBtn.onclick = async () => {
            let val = parseInt(valueSpan.textContent, 10) || 0;
            if (val > 0) val -= 1;
            valueSpan.textContent = val;
            product['In House'] = String(val);
            await saveProducts(products);
        };
        plusBtn.onclick = async () => {
            let val = parseInt(valueSpan.textContent, 10) || 0;
            val += 1;
            valueSpan.textContent = val;
            product['In House'] = String(val);
            await saveProducts(products);
        };

        tdInHouse.appendChild(minusBtn);
        tdInHouse.appendChild(valueSpan);
        tdInHouse.appendChild(plusBtn);

        tr.appendChild(tdInHouse);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    appDiv.appendChild(table);
}

async function renderReadOnlyTable(products) {
    // Sort by numeric value of "location"
    products = products.slice().sort((a, b) => {
        const locA = parseInt(a['location'], 10) || 0;
        const locB = parseInt(b['location'], 10) || 0;
        return locA - locB;
    });

    // Calculate Quantity and filter
    const filtered = products
        .map(p => {
            const weekQty = parseInt(p[currentWeek], 10) || 0;
            const inHouse = parseInt(p['In House'], 10) || 0;
            return { ...p, Quantity: weekQty - inHouse };
        })
        .filter(p => p.Quantity > 0);

    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '';

    appDiv.appendChild(renderToggleButton());
    appDiv.appendChild(renderJsonImportUI((newProducts) => renderReadOnlyTable(newProducts)));
    appDiv.appendChild(renderWeekDropdown(() => renderReadOnlyTable(products)));

    const table = document.createElement('table');
    table.id = 'readonly-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    // Only show "Name" and "Quantity"
    ['Name', 'Quantity'].forEach(field => {
        const th = document.createElement('th');
        th.textContent = field;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    filtered.forEach(product => {
        const tr = document.createElement('tr');

        // Name cell
        const tdName = document.createElement('td');
        tdName.textContent = product['Name'];
        tr.appendChild(tdName);

        // Quantity cell
        const tdQuantity = document.createElement('td');
        tdQuantity.textContent = product.Quantity;
        tr.appendChild(tdQuantity);

        // Toggle crossed-out on click
        tr.style.cursor = 'pointer';
        tr.onclick = () => {
            tr.classList.toggle('crossed-out');
        };

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    appDiv.appendChild(table);
}

async function main() {
    const products = await getAllProducts();
    if (isReadOnly) {
        renderReadOnlyTable(products);
    } else {
        renderUpdateTable(products);
    }
}

main();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
    });
}