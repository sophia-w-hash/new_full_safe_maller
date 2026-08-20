document.addEventListener('DOMContentLoaded', () => {

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('dblclick', () => {
            window.location.reload();
        });
    }

    // Input Element Bindings
    const dashboardEmail = document.getElementById('dashboard-email');
    const dashboardPassword = document.getElementById('dashboard-password');
    const togglePasswordBtn = document.getElementById('toggle-password');

    const subject = document.getElementById('subject');
    const messageBody = document.getElementById('message-body');

    const recipientsInput = document.getElementById('recipients-input');
    const detectedCount = document.getElementById('detected-count');

    const statTotal = document.getElementById('stat-total');
    const statSent = document.getElementById('stat-sent');
    const statFailed = document.getElementById('stat-failed');
    const statRemaining = document.getElementById('stat-remaining');
    
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const sendBtn = document.getElementById('send-btn');

    let extractedEmails = [];
    let isSending = false;

    // Password Toggle
    if (togglePasswordBtn && dashboardPassword) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = dashboardPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            dashboardPassword.setAttribute('type', type);
            togglePasswordBtn.className = type === 'password' ? 'fa-regular fa-eye toggle-pwd' : 'fa-regular fa-eye-slash toggle-pwd';
        });
    }

    // PNG Resizer Floating Control
    let currentSelectedImg = null;
    const resizeControls = document.createElement('div');
    resizeControls.className = 'image-resize-bar hidden';
    resizeControls.innerHTML = `
        <span style="align-self:center; font-weight:bold; margin-right:4px;">Size:</span>
        <button type="button" data-size="20%">20% (Small)</button>
        <button type="button" data-size="40%">40% (Medium)</button>
        <button type="button" data-size="70%">70% (Large)</button>
        <button type="button" data-size="100%">100% (Full)</button>
    `;
    document.body.appendChild(resizeControls);

    if (messageBody) {
        // Auto small size when PNG image is pasted
        messageBody.addEventListener('paste', () => {
            setTimeout(() => {
                const imgs = messageBody.querySelectorAll('img');
                imgs.forEach(img => {
                    if (!img.style.width) {
                        img.style.width = '30%'; 
                        img.style.height = 'auto';
                        img.style.display = 'block';
                        img.style.margin = '10px 0';
                    }
                });
            }, 100);
        });

        // Click PNG Image to Adjust Size
        messageBody.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                currentSelectedImg = e.target;
                const rect = currentSelectedImg.getBoundingClientRect();
                resizeControls.style.top = `${window.scrollY + rect.top - 35}px`;
                resizeControls.style.left = `${window.scrollX + rect.left}px`;
                resizeControls.classList.remove('hidden');
            } else {
                resizeControls.classList.add('hidden');
                currentSelectedImg = null;
            }
        });
    }

    resizeControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && currentSelectedImg) {
            const size = e.target.getAttribute('data-size');
            currentSelectedImg.style.width = size;
            currentSelectedImg.style.height = 'auto';
            resizeControls.classList.add('hidden');
        }
    });

    // Parse Recipient Email Addresses
    function parseRecipients() {
        if (!recipientsInput) return;
        const text = recipientsInput.value || "";
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
        const matches = text.match(emailRegex) || [];

        extractedEmails = [...new Set(matches.map(e => e.toLowerCase().trim()))];

        if (detectedCount) {
            detectedCount.textContent = `${extractedEmails.length} found`;
        }
    }

    if (recipientsInput) {
        recipientsInput.addEventListener('input', parseRecipients);
        parseRecipients();
    }

    // Send All Trigger
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            if (isSending) return;

            parseRecipients();

            const emailVal = dashboardEmail.value.trim();
            const appPasswordVal = dashboardPassword.value.trim();
            const rawSubject = subject.value.trim();
            const rawBody = messageBody.innerHTML.trim();

            if (!emailVal || !appPasswordVal || !rawSubject || !rawBody) {
                return alert('Please fill in Gmail, App Password, Subject, and Body.');
            }

            if (extractedEmails.length === 0) {
                return alert('Please paste recipient emails in Target Recipients section.');
            }

            isSending = true;
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

            if (statTotal) statTotal.textContent = extractedEmails.length;
            if (statSent) statSent.textContent = '0';
            if (statFailed) statFailed.textContent = '0';
            if (statRemaining) statRemaining.textContent = extractedEmails.length;

            if (statusIcon) statusIcon.className = 'fa-solid fa-spinner fa-spin text-primary';
            if (statusText) statusText.textContent = 'Sending emails...';

            let sentCount = 0;
            let failedCount = 0;

            for (let i = 0; i < extractedEmails.length; i++) {
                const recipient = extractedEmails[i];

                try {
                    const sendRes = await fetch('/api/send-single', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: emailVal,
                            appPassword: appPasswordVal,
                            subject: rawSubject,
                            messageBody: rawBody,
                            to: recipient
                        })
                    });

                    const sendResult = await sendRes.json();

                    if (sendRes.ok && sendResult.success) {
                        sentCount++;
                    } else {
                        failedCount++;
                    }
                } catch (e) {
                    failedCount++;
                }

                if (statSent) statSent.textContent = sentCount;
                if (statFailed) statFailed.textContent = failedCount;
                if (statRemaining) statRemaining.textContent = extractedEmails.length - (sentCount + failedCount);

                await new Promise(r => setTimeout(r, 300));
            }

            if (statusIcon) statusIcon.className = 'fa-solid fa-circle-check text-success';
            if (statusText) statusText.textContent = 'Completed!';

            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send All';
            isSending = false;

            alert(`Finished! Sent: ${sentCount}, Failed: ${failedCount}`);
        });
    }
});
