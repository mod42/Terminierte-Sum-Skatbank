// ==UserScript==
// @name         Sum Scheduled Transfers - Skatbank
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  Sum up all scheduled transfers on Skatbank portal (FIXED number parsing)
// @author       You
// @match        https://www.skatbank.de/services_cloud/portal/webcomp/auftraege/terminierte-ueberweisungen*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    console.log('🔍 Skatbank Transfer Summe Script v3.9 geladen!');

    let lastDisplayedTotal = null;
    let lastDisplayedCount = null;
    let containerInstance = null;
    const SCRIPT_VERSION = '3.9';

    function parseAmount(text) {
        if (!text) return 0;
        // normalize non-breaking spaces and trim
        text = text.replace(/\u00A0/g, ' ').trim();

        // Find all substrings that look like German numbers (allow dots, spaces, NBSP as thousands separators)
        const candidates = text.match(/[\d.\s\u00A0]+,\d{2}/g);
        let numStr = null;

        if (candidates && candidates.length) {
            // prefer the longest match (likely includes full thousands separators)
            numStr = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
        } else {
            // fallback: any simple number with decimal comma or point
            const fallback = text.match(/\d+[.,]\d{2}/g);
            if (fallback && fallback.length) numStr = fallback.reduce((a, b) => (a.length >= b.length ? a : b));
            else return 0;
        }

        // normalize: remove spaces and dots used as thousand separators, replace comma with dot
        numStr = numStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
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
                // match full German-format number with optional thousands separators (dot, space, NBSP)
                const match = text.match(/(\d{1,3}(?:[\.\s\u00A0]\d{3})*,\d{2})\s*(EUR|€)/);
                
                if (match && text.length > 50 && text.length < 2000) {
                    // Mark as processed
                    seenElements.add(container);
                    rows.push({
                        text: text,
                        amount: match[1], // now the full German-format amount
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
                console.log(`DEBUG: rawMatched="${row.amount}" -> parsed=${amount}`);
                // Robust date extraction: try several fallbacks
                function extractDateFromRow(row) {
                    const text = row.text;
                    // 1) explicit "Ausf...DD.MM.YYYY"
                    let m = text.match(/Ausf[^\d]*(\d{2}\.\d{2}\.\d{4})/i);
                    if (m) return m[1];
                    // 2) any dd.MM.YYYY in the row
                    m = text.match(/(\d{2}\.\d{2}\.\d{4})/);
                    if (m) return m[1];
                    // 3) walk up ancestors of the element and search their textContent
                    let el = row.element;
                    let depth = 0;
                    while (el && depth < 6) {
                        const t = el.textContent || '';
                        m = t.match(/(\d{2}\.\d{2}\.\d{4})/);
                        if (m) return m[1];
                        el = el.parentElement;
                        depth++;
                    }
                    // 4) fallback label
                    return 'Unbekannt';
                }
                const date = extractDateFromRow(row);
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
        header.textContent = `✓ Überweisungen Summe: ${total.toFixed(2)} € (${count} Transfers) — v${SCRIPT_VERSION}`;
        container.appendChild(header);
        
        // Create a compact bar chart showing sum per day (no transaction list)
        const sums = new Map();
        transfers.forEach(t => {
            const key = t.date || 'N/A';
            sums.set(key, (sums.get(key) || 0) + t.amount);
        });

        // Sort dates (put 'N/A' at the end)
        const entries = Array.from(sums.entries()).sort((a,b) => {
            if (a[0] === 'N/A') return 1;
            if (b[0] === 'N/A') return -1;
            // dd.MM.yyyy -> yyyy-MM-dd for sorting
            const pa = a[0].split('.');
            const pb = b[0].split('.');
            const da = `${pa[2]}-${pa[1]}-${pa[0]}`;
            const db = `${pb[2]}-${pb[1]}-${pb[0]}`;
            return da < db ? -1 : da > db ? 1 : 0;
        });

        const max = entries.reduce((m, e) => Math.max(m, e[1]), 0) || 1;
        const chart = document.createElement('div');
        chart.style.cssText = 'display:flex; gap:6px; align-items:flex-end; padding-top:8px;';

        entries.forEach(([date, sum]) => {
            const barWrap = document.createElement('div');
            barWrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:40px;';

            const bar = document.createElement('div');
            const height = Math.round((sum / max) * 160); // max 160px
            bar.style.cssText = `width: 100%; height: ${height}px; background: rgba(255,255,255,0.85); border-radius:4px; transition:opacity .15s;`;
            bar.title = `${date}: ${sum.toFixed(2)} €`;

            const label = document.createElement('div');
            label.style.cssText = 'font-size:10px; margin-top:6px; text-align:center; word-break:break-word;';
            label.textContent = date === 'N/A' ? 'N/A' : date.replace(/(\d{2})\.(\d{2})\.\d{4}/, '$1.$2');

            barWrap.appendChild(bar);
            barWrap.appendChild(label);
            chart.appendChild(barWrap);
        });

        container.appendChild(chart);
        
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
