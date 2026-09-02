/**
 * Aqua Cargo - Document Templates & PDF Generation
 */

const DocumentTemplates = {
    manifestTemplate(data) {
        return `
            <div class="doc-render-container">
                <div class="doc-header">
                    <div class="doc-logo-area">
                        <div class="doc-logo-icon">A</div>
                        <span class="doc-brand-name">Aqua Cargo</span>
                    </div>
                    <div class="doc-contact-info">
                        <strong>✉ info@cargoaqua.com</strong>
                    </div>
                </div>

                <div class="doc-title">Shipping Manifest</div>

                <div class="doc-info-grid">
                    <div class="doc-info-box"><span class="doc-label">Manifest Number</span><span class="doc-value">${data.manifest_number || 'AC-MAN-' + data.tracking_number}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Date of Shipment</span><span class="doc-value">${new Date(data.created_at).toLocaleDateString()}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Total Packages</span><span class="doc-value">1</span></div>
                    <div class="doc-info-box"><span class="doc-label">Status</span><span class="doc-value">${data.status}</span></div>
                </div>

                <div class="doc-flex-row">
                    <div class="doc-flex-col">
                        <div class="doc-section-header">Shipment Details</div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Tracking Number</span><span class="doc-value">${data.tracking_number}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Origin</span><span class="doc-value">${data.origin_country}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Destination</span><span class="doc-value">${data.destination_country}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none;"><span class="doc-label">Shipping Method</span><span class="doc-value">SEA FREIGHT</span></div>
                    </div>
                    <div class="doc-flex-col">
                        <div class="doc-section-header">Receiver Information</div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Name</span><span class="doc-value">${data.receiver_name || 'Valued Client'}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Email</span><span class="doc-value">${data.receiver_email || '-'}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none;"><span class="doc-label">Delivery Address</span><span class="doc-value">${data.receiver_details}</span></div>
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    <div class="doc-section-header">Package & Container Details</div>
                    <table class="doc-table" style="border-top: none;">
                        <thead>
                            <tr>
                                <th>Container No.</th>
                                <th>Seal No.</th>
                                <th>Weight (KG)</th>
                                <th>Volume (CBM)</th>
                                <th>Dimensions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${data.container_number || 'TBA'}</td>
                                <td>${data.seal_number || 'TBA'}</td>
                                <td>${data.weight_kg} KG</td>
                                <td>${data.measurement_cbm || '-'} CBM</td>
                                <td>${data.dimensions}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="doc-notice-box">
                    <div class="doc-notice-title">— NOTICE —</div>
                    <p class="doc-notice-text">
                        As per our shipping policy and industry regulations, this manifest serves as a critical document confirming the contents and details of this shipment. The accuracy of the goods and compliance with associated documentation is the responsibility of the carrier and consignee.
                    </p>
                </div>

                <div class="doc-section-header">Remarks</div>
                <div class="doc-info-box" style="display:block; width:100%; min-height: 100px; font-size: 8pt; border: 1px solid #cbd5e0; border-top:none;">
                    <strong>Delivery Timeframe:</strong> This shipment is expected to arrive within the estimated delivery period.<br><br>
                    <strong>Real-Time Tracking:</strong> Available at www.cargoaqua.com using your tracking number.<br><br>
                    <strong>Documentation:</strong> Copies of all relevant shipping and customs documents have been included.
                </div>

                <div class="doc-signatures">
                    <div class="doc-sig-box"><div class="doc-sig-label">Shipper's Signature</div></div>
                    <div class="doc-sig-box"><div class="doc-sig-label">Carrier's Signature</div></div>
                    <div class="doc-sig-box"><div class="doc-sig-label">Consignee's Signature</div></div>
                </div>

                <div class="doc-footer">
                    <span class="doc-footer-left">Thank you for choosing Aqua Cargo.</span>
                    <span class="doc-footer-right">Page 1 of 1</span>
                </div>
            </div>
        `;
    },

    billOfLadingTemplate(data) {
        return `
            <div class="doc-render-container">
                <div class="doc-header">
                    <div class="doc-logo-area">
                        <div class="doc-logo-icon">A</div>
                        <span class="doc-brand-name">Aqua Cargo</span>
                    </div>
                    <div class="doc-contact-info">
                        <strong>✉ info@cargoaqua.com</strong>
                    </div>
                </div>

                <div class="doc-title">Bill of Lading (BOL)</div>

                <div class="doc-info-grid">
                    <div class="doc-info-box"><span class="doc-label">BOL Number</span><span class="doc-value">${data.bol_number || 'AC-BOL-' + data.tracking_number}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Booking Number</span><span class="doc-value">${data.booking_number || '-'}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Date of Issue</span><span class="doc-value">${new Date().toLocaleDateString()}</span></div>
                </div>

                <div class="doc-info-grid" style="margin-bottom: 15px;">
                    <div class="doc-info-box">
                        <span class="doc-label">Shipper / Exporter</span>
                        <span class="doc-value">Aqua Cargo Logistics Ltd.<br>123 Ocean Drive<br>Global Logistics Hub</span>
                    </div>
                    <div class="doc-info-box">
                        <span class="doc-label">Consignee</span>
                        <span class="doc-value">${data.receiver_name || 'Valued Client'}<br>${data.receiver_details}</span>
                    </div>
                    <div class="doc-info-box">
                        <span class="doc-label">Notify Party</span>
                        <span class="doc-value">SAME AS CONSIGNEE</span>
                    </div>
                </div>

                <div class="doc-info-grid">
                    <div class="doc-info-box"><span class="doc-label">Vessel / Voyage</span><span class="doc-value">${data.vessel_name || 'TBA'}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Port of Loading</span><span class="doc-value">${data.port_of_loading || data.origin_country}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Port of Discharge</span><span class="doc-value">${data.port_of_discharge || data.destination_country}</span></div>
                    <div class="doc-info-box"><span class="doc-label">Place of Delivery</span><span class="doc-value">${data.place_of_delivery || data.destination_country}</span></div>
                </div>

                <div class="doc-section-header">Particulars Furnished by Shipper</div>
                <table class="doc-table" style="border-top:none;">
                    <thead>
                        <tr>
                            <th>Marks & Nos</th>
                            <th>Description of Goods</th>
                            <th>No. of Pkgs</th>
                            <th>Weight (KG)</th>
                            <th>Measurement</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${data.tracking_number}</td>
                            <td>${data.package_details}</td>
                            <td>1</td>
                            <td>${data.weight_kg} KG</td>
                            <td>${data.measurement_cbm || '-'} CBM</td>
                        </tr>
                    </tbody>
                </table>

                <div class="doc-flex-row">
                    <div class="doc-flex-col">
                        <div class="doc-section-header">Freight & Charges</div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Freight Term</span><span class="doc-value">${data.payment_terms || 'PREPAID'}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none;"><span class="doc-label">Total Charges</span><span class="doc-value">USD ${data.freight_charges || '0.00'}</span></div>
                    </div>
                    <div class="doc-flex-col">
                        <div class="doc-section-header">Container Details</div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none; border-bottom:0.5px solid #e2e8f0;"><span class="doc-label">Container No.</span><span class="doc-value">${data.container_number || 'TBA'}</span></div>
                        <div class="doc-info-box" style="display:block; width:100%; border:none;"><span class="doc-label">Seal No.</span><span class="doc-value">${data.seal_number || 'TBA'}</span></div>
                    </div>
                </div>

                <div style="margin-top: 15px; font-size: 7pt; color: #4a5568;">
                    <strong>TERMS AND CONDITIONS:</strong><br>
                    1. The goods are received in apparent good order and condition unless otherwise stated.<br>
                    2. The shipper, by tendering this Bill of Lading, agrees to be bound by all the terms and conditions hereof.
                </div>

                <div class="doc-signatures">
                    <div class="doc-sig-box"><div class="doc-sig-label">Shipper's Signature & Stamp</div></div>
                    <div class="doc-sig-box"><div class="doc-sig-label">Carrier's Signature & Stamp</div></div>
                    <div class="doc-sig-box"><div class="doc-sig-label">Date & Place of Issue</div></div>
                </div>

                <div class="doc-footer" style="margin-top: 20px;">
                    <span class="doc-footer-left">Thank you for choosing Aqua Cargo.</span>
                    <span class="doc-footer-right">Page 1 of 1</span>
                </div>
            </div>
        `;
    },

    async downloadPDF(type, data) {
        console.log(`Generating ${type} for:`, data.tracking_number);

        const container = document.getElementById('doc-hidden-container');
        if (!container) {
            alert("System error: Render container missing. Please refresh.");
            return;
        }

        // Populate container
        container.innerHTML = type === 'manifest' ? this.manifestTemplate(data) : this.billOfLadingTemplate(data);

        // Give it a moment to render internally
        await new Promise(resolve => setTimeout(resolve, 500));

        const opt = {
            margin: 0,
            filename: `${type === 'manifest' ? 'Shipping_Manifest' : 'Bill_of_Lading'}_${data.tracking_number}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollY: 0,
                logging: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (typeof html2pdf === 'undefined') {
            console.error("Library missing, falling back to print...");
            window.print();
            return;
        }

        try {
            console.log("Saving PDF...");
            await html2pdf().set(opt).from(container.children[0]).save();
            console.log("Done.");
        } catch (err) {
            console.error("PDF Error:", err);
            // Fallback to simple print if PDF generation fails
            if (confirm("Automated PDF generation failed. Would you like to open the print dialog instead?")) {
                const printWindow = window.open('', '_blank');
                printWindow.document.write('<html><head><title>Print Document</title>');
                printWindow.document.write('<link rel="stylesheet" href="styles/style.css">');
                printWindow.document.write('</head><body>');
                printWindow.document.write(container.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 1000);
            }
        } finally {
            // Keep container hidden
            container.innerHTML = '';
        }
    }
};

window.DocumentTemplates = DocumentTemplates;
