const BACKEND_URL = 'https://viewearn-backend.onrender.com'; // Your Backend URL

let currentBalance = 1250; // Initial hardcoded balance, will be fetched from backend
let adTimer = null;
let adTimeLeft = 15;

// Initialize Telegram Web App
Telegram.WebApp.ready();
Telegram.WebApp.BackButton.onClick(goBack); // Link Telegram's back button to your goBack function

function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    document.getElementById(screenId).classList.add('active');

    // Update header and Telegram BackButton visibility
    const backBtn = document.querySelector('.back-btn');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');

    if (screenId === 'home') {
        backBtn.style.display = 'none';
        Telegram.WebApp.BackButton.hide(); // Hide Telegram's back button on home
        headerTitle.textContent = 'View & Earn';
        headerSubtitle.textContent = 'Earn coins by watching ads and completing tasks';
        fetchUserBalance(); // Fetch balance when returning to home or initializing
    } else {
        backBtn.style.display = 'flex';
        Telegram.WebApp.BackButton.show(); // Show Telegram's back button on other screens
        switch(screenId) {
            case 'watch-ad':
                headerTitle.textContent = 'Watch Advertisement';
                headerSubtitle.textContent = 'Watch the full ad to earn coins';
                startAdTimer();
                break;
            case 'tasks':
                headerTitle.textContent = 'Daily Tasks';
                headerSubtitle.textContent = 'Complete tasks to earn extra coins';
                // Potentially fetch tasks from backend here
                break;
            case 'balance':
                headerTitle.textContent = 'My Balance';
                headerSubtitle.textContent = 'Track your earnings and withdrawals';
                updateBalanceDisplay();
                // Potentially fetch detailed balance/history from backend here
                break;
            case 'referral':
                headerTitle.textContent = 'Refer & Earn';
                headerSubtitle.textContent = 'Invite friends and earn together';
                // Potentially fetch referral link and stats from backend here
                break;
            case 'withdraw':
                headerTitle.textContent = 'Withdraw Coins';
                headerSubtitle.textContent = 'Convert your coins to TON';
                // Ensure max attribute for withdraw-amount reflects currentBalance
                document.getElementById('withdraw-amount').max = currentBalance;
                validateWithdrawal(); // Initial validation check
                break;
        }
    }
}

function goBack() {
    showScreen('home');
}

function startAdTimer() {
    adTimeLeft = 15;
    const timerElement = document.getElementById('ad-timer');
    const progressElement = document.getElementById('ad-progress');
    const confirmBtn = document.getElementById('confirm-ad-btn');
    
    confirmBtn.classList.remove('active');
    document.getElementById('ad-success').style.display = 'none';
    timerElement.textContent = adTimeLeft + 's'; // Reset timer display
    progressElement.style.width = '0%'; // Reset progress bar

    clearInterval(adTimer); // Clear any existing timer
    adTimer = setInterval(() => {
        adTimeLeft--;
        timerElement.textContent = adTimeLeft + 's';
        progressElement.style.width = ((15 - adTimeLeft) / 15 * 100) + '%';
        
        if (adTimeLeft <= 0) {
            clearInterval(adTimer);
            timerElement.textContent = 'Complete!';
            progressElement.style.width = '100%';
            confirmBtn.classList.add('active');
        }
    }, 1000);
}

async function confirmAdWatched() {
    const confirmBtn = document.getElementById('confirm-ad-btn');
    if (!confirmBtn.classList.contains('active')) return;

    // Optional: Send data to backend that ad was watched
    // Replace 'user_id_here' with actual user ID from Telegram.WebApp.initDataUnsafe
    const userId = Telegram.WebApp.initDataUnsafe?.user?.id || 'default_user'; 
    try {
        const response = await fetch(`${BACKEND_URL}/api/complete-ad`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: userId, reward: 25 }),
        });
        const data = await response.json();

        if (data.success) {
            currentBalance += 25;
            updateBalanceDisplay();
            
            document.getElementById('ad-success').style.display = 'block';
            confirmBtn.textContent = 'Ad Completed! (+25 coins)';
            confirmBtn.classList.remove('active');

            // Optionally notify Telegram MainButton if it's active
            if (Telegram.WebApp.MainButton.isVisible) {
                Telegram.WebApp.MainButton.hide();
            }

            setTimeout(() => {
                showScreen('home');
            }, 2000);
        } else {
            // Handle error from backend (e.g., ad already claimed)
            console.error('Backend reported an error:', data.message);
            alert('Error: ' + data.message);
            confirmBtn.classList.remove('active'); // Keep button disabled
            confirmBtn.textContent = 'Failed to confirm ad';
        }
    } catch (error) {
        console.error('Error confirming ad with backend:', error);
        alert('Could not connect to server to confirm ad.');
        confirmBtn.classList.remove('active'); // Keep button disabled
        confirmBtn.textContent = 'Connection Error';
    }
}

async function completeTask(button, reward) {
    if (button.classList.contains('completed')) return;

    button.textContent = 'Loading...';

    // Replace 'user_id_here' with actual user ID
    const userId = Telegram.WebApp.initDataUnsafe?.user?.id || 'default_user'; 
    const taskId = button.closest('.task-item').id || `task_${reward}`; // Assign an ID or derive one

    try {
        const response = await fetch(`${BACKEND_URL}/api/complete-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: userId, taskId: taskId, reward: reward }),
        });
        const data = await response.json();

        if (data.success) {
            // Simulate task completion success from backend
            setTimeout(() => {
                button.textContent = 'Completed';
                button.classList.add('completed');
                currentBalance += reward;
                updateBalanceDisplay();
                
                // Show success feedback
                button.textContent = `+${reward} coins!`;
                setTimeout(() => {
                    button.textContent = 'Completed';
                }, 1500);
            }, 1500);
        } else {
            console.error('Backend reported task error:', data.message);
            alert('Error completing task: ' + data.message);
            button.textContent = 'Try Again'; // Revert button on error
        }
    } catch (error) {
        console.error('Error completing task with backend:', error);
        alert('Could not connect to server to complete task.');
        button.textContent = 'Error'; // Revert button on connection error
    }
}

function updateBalanceDisplay() {
    document.getElementById('current-balance').textContent = currentBalance.toLocaleString();
    document.getElementById('balance-current').textContent = currentBalance.toLocaleString();
    // Update max withdrawal amount
    document.getElementById('withdraw-amount').max = currentBalance;
    validateWithdrawal(); // Re-validate withdrawal button state
}

async function fetchUserBalance() {
    const userId = Telegram.WebApp.initDataUnsafe?.user?.id || 'default_user'; 
    try {
        const response = await fetch(`${BACKEND_URL}/api/balance?userId=${userId}`);
        const data = await response.json();
        if (data.success) {
            currentBalance = data.balance;
            updateBalanceDisplay();
        } else {
            console.error('Failed to fetch balance:', data.message);
            // Optionally, handle error gracefully in UI
        }
    } catch (error) {
        console.error('Error fetching balance from backend:', error);
        // Display a message to the user that balance could not be loaded
    }
}


function copyReferralLink() {
    const referralUrl = document.getElementById('referral-url').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(referralUrl).then(() => {
            showCopyFeedback();
            // Optional: send analytics to backend
            // fetch(`${BACKEND_URL}/api/referral-copied`, { method: 'POST', body: JSON.stringify({ userId: Telegram.WebApp.initDataUnsafe?.user?.id }) });
        }).catch(() => {
            fallbackCopy(referralUrl);
        });
    } else {
        fallbackCopy(referralUrl);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showCopyFeedback();
    } catch (err) {
        console.error('Copy failed:', err);
    }
    document.body.removeChild(textArea);
}

function showCopyFeedback() {
    const copyBtn = document.querySelector('.copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    copyBtn.style.background = '#10b981';
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#0088cc';
    }, 2000);
}

function validateWithdrawal() {
    const walletAddress = document.getElementById('wallet-address').value;
    const withdrawAmountInput = document.getElementById('withdraw-amount');
    const withdrawAmount = parseInt(withdrawAmountInput.value);
    const withdrawBtn = document.getElementById('withdraw-btn');
    
    // Basic validation for TON address (can be improved with regex)
    const isValidWallet = walletAddress.length > 10; 
    const isValidAmount = !isNaN(withdrawAmount) && withdrawAmount >= 1000 && withdrawAmount <= currentBalance;
    
    withdrawBtn.disabled = !(isValidWallet && isValidAmount);

    // Provide visual feedback for amount limits
    if (withdrawAmountInput.value !== '') {
        if (withdrawAmount < 1000) {
            withdrawAmountInput.style.borderColor = '#ef4444'; // Red for too low
        } else if (withdrawAmount > currentBalance) {
            withdrawAmountInput.style.borderColor = '#ef4444'; // Red for too high
        } else {
            withdrawAmountInput.style.borderColor = '#e5e7eb'; // Default
        }
    } else {
        withdrawAmountInput.style.borderColor = '#e5e7eb'; // Default
    }
}

async function processWithdrawal() {
    const walletAddress = document.getElementById('wallet-address').value;
    const withdrawAmount = parseInt(document.getElementById('withdraw-amount').value);
    const successMessage = document.getElementById('withdraw-success');
    const withdrawBtn = document.getElementById('withdraw-btn');
    
    // Get user ID from Telegram Web App
    const userId = Telegram.WebApp.initDataUnsafe?.user?.id || 'default_user'; 

    withdrawBtn.textContent = 'Processing...';
    withdrawBtn.disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/api/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                userId: userId, 
                amount: withdrawAmount, 
                walletAddress: walletAddress 
            }),
        });
        const data = await response.json();

        if (data.success) {
            currentBalance -= withdrawAmount; // Update frontend balance
            updateBalanceDisplay();
            
            successMessage.style.display = 'block';
            withdrawBtn.textContent = 'Withdrawal Submitted';
            
            // Reset form fields
            document.getElementById('wallet-address').value = '';
            document.getElementById('withdraw-amount').value = '';
            
            setTimeout(() => {
                showScreen('home'); // Go back to home after success
                successMessage.style.display = 'none'; // Hide success message for next time
            }, 3000);
        } else {
            // Handle specific backend errors (e.g., insufficient balance, invalid address)
            console.error('Withdrawal failed:', data.message);
            alert('Withdrawal Failed: ' + data.message);
            withdrawBtn.textContent = 'Request Withdrawal'; // Revert button text
            validateWithdrawal(); // Re-enable if conditions allow
        }
    } catch (error) {
        console.error('Error processing withdrawal with backend:', error);
        alert('Could not connect to server to process withdrawal.');
        withdrawBtn.textContent = 'Request Withdrawal'; // Revert button text
        validateWithdrawal(); // Re-enable if conditions allow
    }
}

// Initialize app when the DOM is fully loaded and Telegram Web App is ready
document.addEventListener('DOMContentLoaded', () => {
    Telegram.WebApp.onEvent('mainButtonExpanded', () => {
        // Handle main button expansion if needed
    });
    Telegram.WebApp.onEvent('mainButtonCollapsed', () => {
        // Handle main button collapse if needed
    });

    // Fetch initial balance from backend on app load
    fetchUserBalance();
});

// Initial display update based on hardcoded balance before backend fetch completes
updateBalanceDisplay();

