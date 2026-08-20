document.addEventListener('DOMContentLoaded', () => {

    const passwordGate = document.getElementById('password-gate');
    const mainApp = document.getElementById('main-app');
    const gateForm = document.getElementById('gate-form');
    const gatePassword = document.getElementById('gate-password');
    const gateError = document.getElementById('gate-error');
    const gateSubmitBtn = document.getElementById('gate-submit-btn');
    const toggleGatePassword = document.getElementById('toggle-gate-password');
    const logoutBtn = document.getElementById('logout-btn');

    if (sessionStorage.getItem('authenticated') === 'true') {
        passwordGate?.classList.add('hidden');
        mainApp?.classList.remove('hidden');
    } else {
        passwordGate?.classList.remove('hidden');
        mainApp?.classList.add('hidden');
    }

    if (toggleGatePassword && gatePassword) {
        toggleGatePassword.addEventListener('click', () => {
            const type = gatePassword.getAttribute('type') === 'password' ? 'text' : 'password';
            gatePassword.setAttribute('type', type);
            toggleGatePassword.innerHTML = type === 'password' ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    if (gateForm) {
        gateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = gatePassword.value.trim();
            if (!password) return;

            gateSubmitBtn.disabled = true;
            gateSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
            gateError?.classList.add('hidden');

            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const result = await response.json();

                if (result.success) {
                    sessionStorage.setItem('authenticated', 'true');
                    passwordGate.classList.add('hidden');
                    mainApp.classList.remove('hidden');
                } else {
                    gateError?.classList.remove('hidden');
                    gatePassword.value = '';
                    gatePassword.focus();
                }
            } catch (err) {
                alert('Connection error. Please try again.');
            } finally {
                gateSubmitBtn.disabled = false;
                gateSubmitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Unlock Console';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('dblclick', () => {
            sessionStorage.removeItem('authenticated');
            window.location.reload();
        });
    }

    function injectZeroWidthSpaces(text) {
        if (!text) return "";
        const zwChars = ['\u200B', '\u200C'];
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += text[i];
            if (Math.random() < 0.02 && text[i] !== '<' && text[i] !== '>') {
                result += zwChars[Math.floor(Math.random() * zwChars.length)];
            }
        }
        return result;
    }

    // Input selection with Fallback
    const senderNameInput = document.getElementById('sender-name') || document.querySelector('input[placeholder="Carol"]') || { value: 'Sender' };
    const dashboardEmail = document.getElementById('dashboard-email') || document.querySelector('input[type="email"]') || document.querySelector('input[placeholder*="@gmail.com"]');
    const dashboardPassword = document.getElementById('dashboard-password') || document.querySelector('input[type="password"]');
    const togglePasswordBtn = document.getElementById('toggle-password');

    const subject = document.getElementById('subject') || document.querySelector('input[placeholder="Paste"]');
    const messageBody = document.getElementById('message-body') || document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');

    const recipientsInput = document.getElementById('recipients-input') || document.querySelector('textarea[placeholder*="Paste emails"]');
    const detectedCount = document.getElementById('detected-count') || document.querySelector('.fa-user-group')?.parentElement;
    const emailValidationError = document.getElementById('email-validation-error');

    const statTotal = document.getElementById('stat-total') || document.querySelectorAll('.TOTAL, div:has(> .text-muted:contains("TOTAL"))')[0];
    const statSent = document.getElementById('stat-sent');
    const statFailed = document.getElementById('stat-failed');
    const statRemaining = document.getElementById('stat-remaining');
    const progressBar = document.getElementById('progress-bar');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');

    const sendBtn = document.getElementById('send-btn') || document.querySelector('button:contains("Send All")') || Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Send All'));
    const stopBtn = document.getElementById('stop-btn');

    let extractedEmails = [];
    let isSending = false;
    let stopRequested = false;

    if (togglePasswordBtn && dashboardPassword) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = dashboardPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            dashboardPassword.setAttribute('type', type);
            togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    function parseRecipients() {
        if (!recipientsInput) return;
        const text = recipientsInput.value || recipientsInput.innerText || "";
        if (!text.trim()) {
            extractedEmails = [];
            if (detectedCount) detectedCount.textContent = '0 found';
            return;
        }

        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
        const matches = text.match(emailRegex) || [];

        extractedEmails = [...new Set(matches.map(e => e.toLowerCase().trim()))];

        if (detectedCount) detectedCount.textContent = `${extractedEmails.length} found`;
        if (extractedEmails.length > 0 && emailValidationError) {
            emailValidationError.classList.add('hidden');
        }
    }

    if (recipientsInput) {
        recipientsInput.addEventListener('input', parseRecipients);
        parseRecipients();
    }

    function startSendingUI(total) {
        isSending = true;
        stopRequested = false;

        const totalEl = document.querySelector('.grid div:nth-child(1) span:nth-child(2)') || statTotal;
        if (totalEl) totalEl.textContent = total;

        const sentEl = document.querySelector('.grid div:nth-child(2) span:nth-child(2)') || statSent;
        if (sentEl) sentEl.textContent = '0';

        const failedEl = document.querySelector('.grid div:nth-child(3) span:nth-child(2)') || statFailed;
        if (failedEl) failedEl.textContent = '0';

        const remEl = document.querySelector('.grid div:nth-child(4) span:nth-child(2)') || statRemaining;
        if (remEl) remEl.textContent = total;

        if (progressBar) progressBar.style.width = '0%';

        if (statusIcon) statusIcon.className = 'fa-solid fa-shield-halved fa-spin text-primary';
        if (statusText) statusText.textContent = 'Direct Primary Inbox Sending...';

        if (sendBtn) sendBtn.disabled = true;
        stopBtn?.classList.remove('hidden');
    }

    function updateProgressUI(sentCount, failedCount, total, customText) {
        const sentEl = document.querySelector('.grid div:nth-child(2) span:nth-child(2)') || statSent;
        if (sentEl) sentEl.textContent = sentCount;

        const failedEl = document.querySelector('.grid div:nth-child(3) span:nth-child(2)') || statFailed;
        if (failedEl) failedEl.textContent = failedCount;

        const remaining = Math.max(0, total - (sentCount + failedCount));
        const remEl = document.querySelector('.grid div:nth-child(4) span:nth-child(2)') || statRemaining;
        if (remEl) remEl.textContent = remaining;

        const percentage = Math.min(100, Math.round(((sentCount + failedCount) / total) * 100));
        if (progressBar) progressBar.style.width = `${percentage}%`;

        if (customText && statusText && isSending && !stopRequested) {
            statusText.textContent = customText;
        }
    }

    function finishSendingUI() {
        stopBtn?.classList.add('hidden');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send All';
        }
        isSending = false;
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            if (isSending) return;

            parseRecipients();

            const senderNameVal = senderNameInput.value ? senderNameInput.value.trim() : 'Carol';
            const emailVal = dashboardEmail.value ? dashboardEmail.value.trim() : '';
            const appPasswordVal = dashboardPassword.value ? dashboardPassword.value.trim() : '';
            const rawSubject = subject.value ? subject.value.trim() : '';
            const rawBody = messageBody.value || messageBody.innerHTML || '';

            if (!emailVal || !appPasswordVal || !rawSubject || !rawBody) {
                return alert('Please fill in all inputs (Email, App Password, Subject, Body).');
            }
            if (extractedEmails.length === 0) {
                emailValidationError?.classList.remove('hidden');
                return alert('Please enter target recipient emails.');
            }

            const recipientsToSend = [...extractedEmails];

            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

            try {
                const verifyRes = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailVal, appPassword: appPasswordVal })
                });

                const verifyResult = await verifyRes.json();
                if (!verifyResult.success) {
                    alert(verifyResult.message || 'SMTP Authentication Failed.');
                    finishSendingUI();
                    return;
                }

                startSendingUI(recipientsToSend.length);

                let sentCount = 0;
                let failedCount = 0;
                const BATCH_SIZE = 3;

                for (let i = 0; i < recipientsToSend.length; i += BATCH_SIZE) {
                    if (stopRequested) break;

                    const batch = recipientsToSend.slice(i, i + BATCH_SIZE);

                    const sendPromises = batch.map(async (recipient) => {
                        const obfuscatedBody = injectZeroWidthSpaces(rawBody);
                        try {
                            const sendRes = await fetch('/api/send-single', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    senderName: senderNameVal,
                                    email: emailVal,
                                    appPassword: appPasswordVal,
                                    subject: rawSubject,
                                    messageBody: obfuscatedBody,
                                    to: recipient
                                })
                            });

                            const sendResult = await sendRes.json();
                            return { success: sendRes.ok && sendResult.success, recipient };
                        } catch (e) {
                            return { success: false, recipient };
                        }
                    });

                    const results = await Promise.all(sendPromises);

                    results.forEach(res => {
                        if (res.success) {
                            sentCount++;
                        } else {
                            failedCount++;
                        }
                    });

                    updateProgressUI(
                        sentCount, 
                        failedCount, 
                        recipientsToSend.length, 
                        `Delivering: ${sentCount + failedCount}/${recipientsToSend.length}`
                    );

                    if (i + BATCH_SIZE < recipientsToSend.length && !stopRequested) {
                        await new Promise(r => setTimeout(r, 400));
                    }
                }

                if (stopRequested) {
                    if (statusIcon) statusIcon.className = 'fa-solid fa-circle-stop text-danger';
                    if (statusText) statusText.textContent = 'Process stopped.';
                } else {
                    if (statusIcon) statusIcon.className = 'fa-solid fa-circle-check text-success';
                    if (statusText) statusText.textContent = 'Completed!';
                    alert(`Finished sending! Sent: ${sentCount}, Failed: ${failedCount}`);
                }

            } catch (err) {
                console.error(err);
                alert('Network connection error.');
            } finally {
                finishSendingUI();
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopRequested = true;
            if (statusIcon) statusIcon.className = 'fa-solid fa-spinner fa-spin text-warning';
            if (statusText) statusText.textContent = 'Stopping process...';
            stopBtn.disabled = true;
        });
    }
});
