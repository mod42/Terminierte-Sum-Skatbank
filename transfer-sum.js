// ==UserScript==
// @name         Sum Scheduled Transfers - Skatbank
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Sum up all scheduled transfers on Skatbank portal
// @author       You
// @match        *skatbank*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    console.log('🔍 Skatbank Transfer Summe Script geladen!');

    let lastDisplayedTotal = null;
    let lastDisplayedCount = null;
    let containerInstance = null;
    let foundTransfers = new Map(); // Store transfers by amount to prevent duplicates

    console.log('🔍 Skatbank Transfer Summe Script geladen');

    // Function to extract amount from text (handles various formats: 1.234,56 or 1,234.56)
    function parseAmount(text) {
        if (!text) return 0;
        text = text.trim();
        const match = text.match(/[\d.,]+/);
        if (!match) return 0;
        
        let numStr = match[0];
        const lastComma = numStr.lastIndexOf(',');
        const lastDot = numStr.lastIndexOf('.');
        
        let amount = 0;
        if (lastComma > lastDot) {
            amount = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
        } else if (lastDot > lastComma) {
            amount = parseFloat(numStr.replace(/,/g, ''));
        } else if (lastComma >= 0) {
            amount = parseFloat(numStr.replace(',', '.'));
        } else {
            amount = parseFloat(numStr);
        }
        
        return isNaN(amount) ? 0 : amount;
    }

    // Function to find and sum transfers - improved for Skatbank
    function sumTransfers() {
        let total = 0;
        const transfers = [];
        const processedAmounts = new Map(); // key: `amount_parentElement`, value: true

        console.log('🔍 Scanning for transfers...');

        // Find all elements containing "EUR" text (should be 16 per diagnostic)
        const allElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.includes('EUR')
        );
        
        console.log(`Total elements with EUR text: ${allElements.length}`);
        
        // For each EUR element, find the associated amount
        allElements.forEach(eurElement => {
            // Look for amount in nearby text (could be in same element or sibling)
            let amountStr = null;
            let amountValue = 0;
            
            // Check if this element itself contains the amount pattern
            const selfMatch = eurElement.textContent.match(/(\d+[.,]\d{2})\s*(EUR|€)/);
            if (selfMatch) {
                amountStr = selfMatch[1];
                amountValue = parseAmount(amountStr);
            }
            
            // If we found a valid amount
            if (amountValue > 0 && amountValue < 1000000) {
                // Find the closest parent container (go up to find the row/transfer container)
                let container = eurElement.parentElement;
                let depth = 0;
                while (container && depth < 5) {
                    const containerText = container.textContent;
                    if (containerText.length > 50) { // Likely a full transfer container
                        break;
                    }
                    container = container.parentElement;
                    depth++;
                }
                
                if (!container) container = eurElement;
                
                // Create unique key based on amount and parent container
                const key = `${amountValue.toFixed(2)}_${container.className}`;
                
                // Only add if not already processed
                if (!processedAmounts.has(key)) {
                    processedAmounts.set(key, true);
                    total += amountValue;
                    transfers.push({
                        text: (container.textContent || '').substring(0, 100),
                        amount: amountValue
                    });
                    console.log(`Transfer ${transfers.length}: ${amountValue.toFixed(2)} EUR`);
                }
            }
        });

        const transferCount = transfers.length;
        console.log(`✓ Found ${transferCount} transfers, Total: ${total.toFixed(2)} €`);
        return { total, transferCount, transfers };
    }

    // Scan and update results
    function scanAndUpdate() {
        const { total, transferCount, transfers } = sumTransfers();

        // Only update display if numbers changed
        if (total !== lastDisplayedTotal || transferCount !== lastDisplayedCount) {
            lastDisplayedTotal = total;
            lastDisplayedCount = transferCount;
            
            if (containerInstance) {
                containerInstance.remove();
            }
            
            if (transferCount > 0) {
                displayResults(total, transferCount, transfers);
            }
        }
    }

    // Display the sum in a floating box
    function displayResults(total, count, transfers) {
        const container = document.createElement('div');
        container.id = 'transfer-sum-display';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
            z-index: 10000;
            min-width: 280px;
            max-height: 500px;
            overflow-y: auto;
            cursor: move;
        `;

        const header = document.createElement('h3');
        header.textContent = '📊 Überweisungen Summe';
        header.style.cssText = 'margin: 0 0 10px 0; font-size: 16px; font-weight: bold;';
        container.appendChild(header);

        const stats = document.createElement('div');
        stats.style.cssText = 'border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px; margin-bottom: 10px;';
        
        const countEl = document.createElement('p');
        countEl.style.cssText = 'margin: 5px 0; font-size: 13px;';
        countEl.textContent = `Anzahl: ${count}`;
        stats.appendChild(countEl);

        const totalEl = document.createElement('p');
        totalEl.style.cssText = 'margin: 5px 0; font-size: 20px; font-weight: bold;';
        totalEl.innerHTML = `<span style="color: #ffd700;">${total.toFixed(2)} €</span>`;
        stats.appendChild(totalEl);

        container.appendChild(stats);

        // List of transfers
        if (transfers.length > 0 && transfers.length <= 30) {
            const listHeader = document.createElement('p');
            listHeader.style.cssText = 'margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase;';
            listHeader.textContent = 'Details:';
            container.appendChild(listHeader);

            transfers.forEach((transfer, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'font-size: 11px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1); line-height: 1.3;';
                item.innerHTML = `<strong>${transfer.amount.toFixed(2)} €</strong><br><small>${transfer.text.substring(0, 70)}</small>`;
                container.appendChild(item);
            });
        }

        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄';
        refreshBtn.title = 'Aktualisieren';
        refreshBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 35px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            hover: background: rgba(255,255,255,0.3);
        `;
        refreshBtn.onclick = () => scanAndUpdate();
        container.appendChild(refreshBtn);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.title = 'Schließen';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
        `;
        closeBtn.onclick = () => container.remove();
        container.appendChild(closeBtn);

        document.body.appendChild(container);
        containerInstance = container;
        makeDraggable(container);

        console.log(`✓ Überweisungen Summe: ${total.toFixed(2)} € (${count} Transfers)`);
    }

    // Make element draggable
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Set up MutationObserver to watch for DOM changes
    function setupObserver() {
        // Don't use MutationObserver - just do initial scans
        // The observer was causing an endless loop
        console.log('📡 Observer setup skipped (using initial scans only)');
    }

    // Initial scans with delays
    function startScanning() {
        console.log('⏱️ Starte Scan-Sequenz...');
        
        // Page is still loading - need MUCH longer waits
        setTimeout(() => { console.log('Diagnostic 1 (2s)...'); logDiagnostics(); }, 2000);
        setTimeout(() => { console.log('Diagnostic 2 (5s)...'); logDiagnostics(); }, 5000);
        setTimeout(() => { console.log('Diagnostic 3 (10s)...'); logDiagnostics(); }, 10000);
        
        // Scans at longer intervals to wait for data to load
        setTimeout(() => { console.log('Scan 1 (3s)...'); scanAndUpdate(); }, 3000);
        setTimeout(() => { console.log('Scan 2 (6s)...'); scanAndUpdate(); }, 6000);
        setTimeout(() => { console.log('Scan 3 (8s)...'); scanAndUpdate(); }, 8000);
        setTimeout(() => { console.log('Scan 4 (12s)...'); scanAndUpdate(); }, 12000);
        setTimeout(() => { console.log('Scan 5 (15s)...'); scanAndUpdate(); }, 15000);
        setTimeout(() => { console.log('Scan 6 (20s)...'); scanAndUpdate(); }, 20000);
        
        // Set up observer for continuous updates
        setupObserver();
    }

    // Diagnostic function to help debug
    function logDiagnostics() {
        console.log('=== DIAGNOSTIC INFO ===');
        
        // Page load status
        const bodyText = document.body.textContent;
        console.log(`Page still loading ("Lade"): ${bodyText.includes('Lade')}`);
        
        // Log elements with EUR (not from STYLE)
        const eurElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.includes('EUR') && el.children.length === 0 && el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
        );
        console.log(`Elements with EUR (excluding styles): ${eurElements.length}`);
        eurElements.slice(0, 15).forEach(el => {
            console.log(`  ${el.tagName}: "${el.textContent.substring(0, 60)}"`);
        });
        
        // Look for any amount-like content (not in STYLE/SCRIPT)
        const amountElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.match(/\d+[.,]\d{2}/) && el.children.length === 0 && el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
        );
        console.log(`Amount-like elements (X,XX format, no styles): ${amountElements.length}`);
        amountElements.slice(0, 15).forEach(el => {
            console.log(`  ${el.tagName}: "${el.textContent.substring(0, 60)}"`);
        });
        
        // Check for visible transfer data
        const rowDivs = document.querySelectorAll('div[class*="row"], div[class*="item"], div[class*="transfer"], div[class*="data"]');
        console.log(`Possible transfer rows: ${rowDivs.length}`);
        Array.from(rowDivs).slice(0, 10).forEach((el, idx) => {
            if (el.textContent.length > 20 && el.textContent.includes('EUR')) {
                console.log(`  ${idx}: "${el.textContent.substring(0, 80)}"`);
            }
        });
        
        console.log('=== END DIAGNOSTIC ===');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startScanning);
    } else {
        startScanning();
    }
})();
