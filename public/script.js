document.addEventListener('DOMContentLoaded', () => {

    // ==================== AUTHENTICATION UI ====================
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
            gateSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
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
                alert('Connection error. Try again.');
            } finally {
                gateSubmitBtn.disabled = false;
                gateSubmitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Enter';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('dblclick', () => {
            sessionStorage.removeItem('authenticated');
            window.location.reload();
        });
    }

    // ==================== ADVANCED ANTI-SPAM INJECTOR ====================
    // Inserts zero-width non-joiner characters invisibly to prevent content signature detection
    function injectZeroWidthSpace(text) {
        if (!text) return "";
        const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += text[i];
            if (Math.random() < 0.12 && text[i] !== '<' && text[i] !== '>') {
                result += zwChars[Math.floor(Math.random() * zwChars.length)];
            }
        }
        return result;
    }

    // ==================== DASHBOARD & SENDING LOOP ====================
    const dashboardEmail = document.getElementById('dashboard-email');
    const dashboardPassword = document.getElementById('dashboard-password');
    const togglePasswordBtn = document.getElementById('toggle-password');

    const senderName = document.getElementById('sender-name');
    const subject = document.getElementById('subject');
    const messageBody = document.getElementById('message-body');

    const recipientsInput = document.getElementById('recipients-input');
    const detectedCount = document.getElementById('detected-count');
    const emailValidationError = document.getElementById('email-validation-error');

    const statTotal = document.getElementById('stat-total');
    const statSent = document.getElementById('stat-sent');
    const statFailed = document.getElementById('stat-failed');
    const statRemaining = document.getElementById('stat-remaining');
    const progressBar = document.getElementById('progress-bar');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');

    const sendBtn = document.getElementById('send-btn');
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

    if (recipientsInput) {
        recipientsInput.addEventListener('input', () => {
            const text = recipientsInput.value;
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
        });
    }

    function startSendingUI(total) {
        isSending = true;
        stopRequested = false;
        if (statTotal) statTotal.textContent = total;
        if (statSent) statSent.textContent = '0';
        if (statFailed) statFailed.textContent = '0';
        if (statRemaining) statRemaining.textContent = total;
        if (progressBar) progressBar.style.width = '0%';

        if (statusIcon) statusIcon.className = 'fa-solid fa-shield-halved fa-spin text-primary';
        if (statusText) statusText.textContent = 'High-Inbox Protection Sending...';

        sendBtn?.classList.add('hidden');
        stopBtn?.classList.remove('hidden');
        if (stopBtn) stopBtn.disabled = false;
    }

    function updateProgressUI(sentCount, failedCount, total, customText) {
        if (statSent) statSent.textContent = sentCount;
        if (statFailed) statFailed.textContent = failedCount;

        const remaining = Math.max(0, total - (sentCount + failedCount));
        if (statRemaining) statRemaining.textContent = remaining;

        const percentage = Math.min(100, Math.round(((sentCount + failedCount) / total) * 100));
        if (progressBar) progressBar.style.width = `${percentage}%`;

        if (customText && statusText && isSending && !stopRequested) {
            statusText.textContent = customText;
        }
    }

    function finishSendingUI() {
        sendBtn?.classList.remove('hidden');
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

            const emailVal = dashboardEmail.value.trim();
            const appPasswordVal = dashboardPassword.value.trim();
            const senderNameVal = senderName.value.trim();
            const rawSubject = subject.value.trim();
            const rawBody = messageBody.body ? messageBody.body.trim() : messageBody.value.trim();

            if (!emailVal || !appPasswordVal || !senderNameVal || !rawSubject || !rawBody) {
                return alert('Please fill in all input fields.');
            }
            if (extractedEmails.length === 0) {
                emailValidationError?.classList.remove('hidden');
                return alert('Please enter recipient emails.');
            }

            const recipientsToSend = [...extractedEmails];
            const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]')?.value || "";

            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

            try {
                // 1. SMTP Credentials Verification
                const verifyRes = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailVal, appPassword: appPasswordVal, cfToken: turnstileResponse })
                });

                const verifyResult = await verifyRes.json();
                if (!verifyResult.success) {
                    alert(verifyResult.message || 'SMTP Verification failed.');
                    finishSendingUI();
                    return;
                }

                startSendingUI(recipientsToSend.length);

                let sentCount = 0;
                let failedCount = 0;

                // ==================== EXACT SPEED PARALLEL BATCH SENDING ====================
                const BATCH_SIZE = 5;

                for (let i = 0; i < recipientsToSend.length; i += BATCH_SIZE) {
                    if (stopRequested) break;

                    const batch = recipientsToSend.slice(i, i + BATCH_SIZE);

                    const sendPromises = batch.map(async (recipient) => {
                        const uniqueBody = injectZeroWidthSpace(rawBody);
                        try {
                            const sendRes = await fetch('/api/send-single', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    email: emailVal,
                                    appPassword: appPasswordVal,
                                    senderName: senderNameVal,
                                    subject: rawSubject,
                                    messageBody: uniqueBody,
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

                    // Same Gap Delay
                    if (i + BATCH_SIZE < recipientsToSend.length && !stopRequested) {
                        await new Promise(r => setTimeout(r, 50));
                    }
                }

                if (stopRequested) {
                    if (statusIcon) statusIcon.className = 'fa-solid fa-circle-stop text-danger';
                    if (statusText) statusText.textContent = 'Process stopped.';
                } else {
                    if (statusIcon) statusIcon.className = 'fa-solid fa-circle-check text-success';
                    if (statusText) statusText.textContent = 'Completed!';
                    alert(`Completed! Sent: ${sentCount}, Failed: ${failedCount}`);
                }

            } catch (err) {
                console.error(err);
                alert('Connection error occurred.');
            } finally {
                finishSendingUI();
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopRequested = true;
            if (statusIcon) statusIcon.className = 'fa-solid fa-spinner fa-spin text-warning';
            if (statusText) statusText.textContent = 'Stopping send process...';
            stopBtn.disabled = true;
        });
    }
});
