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

    // Input selection
    const senderNameInput = document.getElementById('sender-name') || document.querySelector('input[placeholder="Carol"]') || { value: 'Carol' };
    const dashboardEmail = document.getElementById('dashboard-email') || document.querySelector('input[type="email"]');
    const dashboardPassword = document.getElementById('dashboard-password') || document.querySelector('input[type="password"]');
    const togglePasswordBtn = document.getElementById('toggle-password');

    const subject = document.getElementById('subject') || document.querySelector('input[placeholder="Paste"]');
    let messageBody = document.getElementById('message-body');

    // Upgrade Textarea to Rich-Text Container for Resizable PNG Support
    if (messageBody && messageBody.tagName === 'TEXTAREA') {
        const divEditor = document.createElement('div');
        divEditor.id = 'message-body';
        divEditor.contentEditable = "true";
        divEditor.className = messageBody.className;
        divEditor.style.cssText = "min-height: 180px; max-height: 350px; overflow-y: auto; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; background: #fff; outline: none;";
        divEditor.innerHTML = messageBody.value || "Hey! Your site has an attractive appearance but isn't visible among the main sections. May I share the quote?";
        messageBody.parentNode.replaceChild(divEditor, messageBody);
        messageBody = divEditor;
    }

    // Image Resize Toolbar Injector
    let currentSelectedImg = null;
    const resizeControls = document.createElement('div');
    resizeControls.className = 'image-resize-bar hidden';
    resizeControls.style.cssText = 'position: absolute; z-index: 99; background: #1f2937; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; display: flex; gap: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);';
    resizeControls.innerHTML = `
        <span style="align-self: center; font-weight: bold; margin-right: 4px;">PNG Size:</span>
        <button type="button" data-size="25%" style="background: #374151; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Small (25%)</button>
        <button type="button" data-size="50%" style="background: #374151; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Medium (50%)</button>
        <button type="button" data-size="75%" style="background: #374151; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Large (75%)</button>
        <button type="button" data-size="100%" style="background: #374151; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Full (100%)</button>
    `;
    document.body.appendChild(resizeControls);

    if (messageBody) {
        // Auto default small sizing on pasted PNG images
        messageBody.addEventListener('paste', (e) => {
            setTimeout(() => {
                const imgs = messageBody.querySelectorAll('img');
                imgs.forEach(img => {
                    if (!img.style.width) {
                        img.style.width = '30%'; // Default small size
                        img.style.height = 'auto';
                        img.style.display = 'block';
                        img.style.margin = '10px 0';
                        img.style.cursor = 'pointer';
                    }
                });
            }, 100);
        });

        // Click on PNG image inside editor to show resize toolbar
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

    const recipientsInput = document.getElementById('recipients-input') || document.querySelector('textarea[placeholder*="Paste emails"]');
    const detectedCount = document.getElementById('detected-count') || document.querySelector('.fa-user-group')?.parentElement;
    const emailValidationError = document.getElementById('email-validation-error');

    const statTotal = document.getElementById('stat-total');
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

        if (statTotal) statTotal.textContent = total;
        if (statSent) statSent.textContent = '0';
        if (statFailed) statFailed.textContent = '0';
        if (statRemaining) statRemaining.textContent = total;
        if (progressBar) progressBar.style.width = '0%';

        if (statusIcon) statusIcon.className = 'fa-solid fa-shield-halved fa-spin text-primary';
        if (statusText) statusText.textContent = 'Direct Primary Inbox Sending...';

        if (sendBtn) sendBtn.disabled = true;
        stopBtn?.classList.remove('hidden');
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
            const rawBody = messageBody.innerHTML || messageBody.value || '';

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
                        try {
                            const sendRes = await fetch('/api/send-single', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    senderName: senderNameVal,
                                    email: emailVal,
                                    appPassword: appPasswordVal,
                                    subject: rawSubject,
                                    messageBody: rawBody,
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
