// ==UserScript==
// @name         Sum Scheduled Transfers - Skatbank
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  Sum up all scheduled transfers on Skatbank portal (FIXED number parsing)
// @author       You
// @match        https://www.skatbank.de/services_cloud/portal/webcomp/auftraege/terminierte-ueberweisungen*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    console.log('🔍 Skatbank Transfer Summe Script v3.4 geladen!');

    let lastDisplayedTotal = null;
    let lastDisplayedCount = null;
    let containerInstance = null;

    function parseAmount(text) {
        if (!text) return 0;
        text = text.trim();
        const match = text.match(/[\d.,]+/);
        if (!match) return 0;
        
        let numStr = match[0];
        // German format: . = thousands, , = decimal
        // Simply remove dots and replace comma with dot
        numStr = numStr.replace(/\./g, '').replace(',', '.');
        
        const amount = parseFloat(numStr);
        return isNaN(amount) ? 0 : amount;
    }

    // FIXED: Find unique transfer rows by DOM hierarchy
    function findTransferRows() {
        const rows = [];
        const seenElements = new WeakSet();
        
        const eurSpans = Array.from(document.querySelectorAll('span')).filter(s => s.textContent.includes('EUR'));
        console.log(`Found ${eurSpans.length} EUR spans`);
        
        eurSpans.forEach(eurSpan => {
            let container = eurSpan;
            let depth = 0;
            
            while (container && depth < 10) {
                // Skip if already processed this exact element
                if (seenElements.has(container)) {
                    return;
                }
                
                const text = container.textContent;
                const match = text.match(/(\d+[.,]\d{2})\s*(EUR|€)/);
                
                if (match && text.length > 50 && text.length < 2000) {
                    // Mark as processed
                    seenElements.add(container);
                    rows.push({
                        text: text,
                        amount: match[1],
                        element: container,
                        depth: depth
                    });
                    return; // Found the transfer row, stop searching up
                }
                
                container = container.parentElement;
                depth++;
            }
        });
        
        return rows;
    }

    function sumTransfers() {
        let total = 0;
        const transfers = [];
        const uniqueTransfers = new Map();

        console.log('🔍 Scanning for transfers...');

        const rows = findTransferRows();
        console.log(`Found ${rows.length} potential transfer rows`);
        
        rows.forEach((row, idx) => {
            const amount = parseAmount(row.amount);
            if (amount > 0 && amount < 1000000) {
                const dateMatch = row.text.match(/Ausf[^\d]*(\d{2}\.\d{2}\.\d{4})/);
                const date = dateMatch ? dateMatch[1] : 'N/A';
                const signature = `${amount.toFixed(2)}_${date}`;
                
                if (!uniqueTransfers.has(signature)) {
                    uniqueTransfers.set(signature, true);
                    total += amount;
                    transfers.push({ amount, date });
                    console.log(`Transfer ${transfers.length}: ${amount.toFixed(2)} EUR (${date})`);
                }
            }
        });

        console.log(`✓ Found ${transfers.length} transfers, Total: ${total.toFixed(2)} €`);
        return { total, count: transfers.length, transfers };
    }

    function scanAndUpdate() {
        const result = sumTransfers();
        if (result.total !== lastDisplayedTotal || result.count !== lastDisplayedCount) {
            lastDisplayedTotal = result.total;
            lastDisplayedCount = result.count;
            if (containerInstance) containerInstance.remove();
            if (result.count > 0) displayResults(result.total, result.count, result.transfers);
        }
    }

    function displayResults(total, count, transfers) {
        const container = document.createElement('div');
        container.id = 'transfer-sum-display';
        container.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: Arial, sans-serif; z-index: 10000; min-width: 280px; max-height: 500px; overflow-y: auto; cursor: move;`;
        
        const header = document.createElement('div');
        header.style.cssText = 'font-size: 14px; margin-bottom: 10px; font-weight: bold;';
        header.textContent = `✓ Überweisungen Summe: ${total.toFixed(2)} € (${count} Transfers)`;
        container.appendChild(header);
        
        const list = document.createElement('div');
        list.style.cssText = 'font-size: 11px; max-height: 400px; overflow-y: auto;';
        transfers.forEach((t, i) => {
            const item = document.createElement('div');
            item.style.cssText = 'margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 4px;';
            item.textContent = `${i+1}. ${t.amount.toFixed(2)} € (${t.date})`;
            list.appendChild(item);
        });
        container.appendChild(list);
        
        document.body.appendChild(container);
        makeDraggable(container);
        containerInstance = container;
    }

    function makeDraggable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        el.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
                el.style.bottom = 'auto';
                el.style.right = 'auto';
            };
        };
    }

    function startScanning() {
        console.log('⏱️ Starte Scan-Sequenz...');
        const delays = [2000, 3000, 5000, 6000, 8000, 10000, 12000, 15000, 20000];
        delays.forEach(delay => setTimeout(scanAndUpdate, delay));
    }

    startScanning();
})();
