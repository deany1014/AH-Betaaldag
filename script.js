// Laad betaaldagen uit JSON
let paydaysData = null;
let confettiTriggered = false;

async function loadPaydays() {
    try {
        const response = await fetch('payday.json');
        paydaysData = await response.json();
    } catch (error) {
        console.error('Fout bij laden betaaldagen:', error);
    }
}

// Bepaal volgende betaaldag op basis van JSON data
function getNextPayday() {
    if (!paydaysData || !paydaysData.betaaldagen_2026) {
        // Fallback naar 25e als JSON niet beschikbaar is
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();
        let paydayDate = new Date(currentYear, currentMonth, 25);
        if (currentDay >= 25) {
            paydayDate = new Date(currentYear, currentMonth + 1, 25);
        }
        return paydayDate;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowInMinutes = currentHour * 60 + currentMinute;
    
    // Parse vandaag correct
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const today = new Date(year, month, day);

    // Zoek eerste betaaldag die nog moet komen
    for (let payday of paydaysData.betaaldagen_2026) {
        const paydayDateString = payday.datum;
        
        // Parse betaaldag correct uit YYYY-MM-DD format
        const [payYear, payMonth, payDay] = paydayDateString.split('-').map(Number);
        const paydayDate = new Date(payYear, payMonth - 1, payDay);
        
        // Als betaaldag in de toekomst is (na vandaag)
        if (paydayDate > today) {
            const date = new Date(payYear, payMonth - 1, payDay);
            date.setHours(7, 30, 0, 0);
            return date;
        }
        
        // Check of dit vandaag is
        if (paydayDate.getTime() === today.getTime()) {
            const paymentStart = 7 * 60 + 30; // 07:30 in minuten
            const paymentEnd = 12 * 60; // 12:00 in minuten
            
            // Als het tussen 07:30 en 12:00 is, wacht tot 12:00
            if (nowInMinutes >= paymentStart && nowInMinutes < paymentEnd) {
                const date = new Date(payYear, payMonth - 1, payDay);
                date.setHours(12, 0, 0, 0);
                return date;
            }
            // Als het voor 07:30 is, zet naar 07:30
            else if (nowInMinutes < paymentStart) {
                const date = new Date(payYear, payMonth - 1, payDay);
                date.setHours(7, 30, 0, 0);
                return date;
            }
            // Als het na 12:00 is, ga naar volgende betaaldag (continue loop)
        }
    }

    // Als geen betaaldag gevonden, return 1 januari volgende jaar
    return new Date(year + 1, 0, 1, 7, 30, 0, 0);
}

// Krijg de volgende betaaldag data inclusief personeelskorting
function getNextPaydayData() {
    if (!paydaysData || !paydaysData.betaaldagen_2026) {
        return { datum: null, personeelskorting: false };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const today = new Date(year, month, day);

    // Zoek eerste betaaldag die nog moet komen
    for (let payday of paydaysData.betaaldagen_2026) {
        const paydayDateString = payday.datum;
        
        // Parse betaaldag correct uit YYYY-MM-DD format
        const [payYear, payMonth, payDay] = paydayDateString.split('-').map(Number);
        const paydayDate = new Date(payYear, payMonth - 1, payDay);
        
        // Als betaaldag in de toekomst is of vandaag is
        if (paydayDate >= today) {
            return payday;
        }
    }

    return { datum: null, personeelskorting: false };
}

// Format datum naar Nederlands formaat
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('nl-NL', options);
}

// Check of betalingen in uitvoering zijn (tussen 07:30 en 12:00)
function isPaymentInProgress() {
    if (!paydaysData || !paydaysData.betaaldagen_2026) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowInMinutes = currentHour * 60 + currentMinute;
    const todayString = now.toISOString().split('T')[0];
    
    // Check of vandaag een betaaldatum is
    for (let payday of paydaysData.betaaldagen_2026) {
        if (payday.datum === todayString) {
            const paymentStart = 7 * 60 + 30; // 07:30
            const paymentEnd = 12 * 60; // 12:00
            
            // Als het tussen 07:30 en 12:00 is
            return nowInMinutes >= paymentStart && nowInMinutes < paymentEnd;
        }
    }
    
    return false;
}

// Update countdown display met animatie
function updateCountdown() {
    const now = new Date().getTime();
    const currentHour = new Date().getHours();
    
    // Om 02:00 's nachts reset de confetti en andere state
    if (currentHour === 2 && confettiTriggered) {
        confettiTriggered = false;
        console.log('🔄 02:00 - Confetti reset voor volgende dag');
    }
    
    const isPaymentTime = isPaymentInProgress();
    
    const countdownDisplay = document.querySelector('.countdown-display');
    const paymentMessage = document.getElementById('payment-message');
    const paydayInfo = document.querySelector('.next-payday-info');
    
    if (isPaymentTime) {
        // Verberg countdown, toon bericht
        countdownDisplay.style.display = 'none';
        if (paymentMessage) {
            paymentMessage.style.display = 'block';
        }
        paydayInfo.style.display = 'none';
    } else {
        countdownDisplay.style.display = 'flex';
        if (paymentMessage) paymentMessage.style.display = 'none';
        paydayInfo.style.display = 'block';
        
        const payday = getNextPayday().getTime();
        const distance = payday - now;

        // Als countdown negatief wordt, reset en herbereken
        if (distance < 0) {
            console.log('⚠️ Countdown negatief, resetting...');
            confettiTriggered = false;
        }

        // Bereken tijd eenheden
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Debug logging elke 10 seconden
        if (seconds % 10 === 0 && parseInt(document.getElementById('seconds').textContent) === seconds) {
            console.log(`⏰ Distance: ${distance}ms | D:${days} H:${hours} M:${minutes} S:${seconds}`);
        }

        // Update DOM met animatie
        updateElementWithAnimation('days', days);
        updateElementWithAnimation('hours', hours);
        updateElementWithAnimation('minutes', minutes);
        updateElementWithAnimation('seconds', seconds);

        // Update betaaldag datum
        document.getElementById('payday-date').textContent = formatDate(getNextPayday());
        
        // Update personeelskorting info
        const paydayData = getNextPaydayData();
        const kortingElement = document.getElementById('korting-info');
        if (kortingElement) {
            if (paydayData.personeelskorting) {
                kortingElement.textContent = '💚 Met personeelskorting - Je krijgt extra!';
                kortingElement.className = 'korting-info korting-yes';
                kortingElement.style.display = 'block';
            } else {
                kortingElement.style.display = 'none';
            }
        }

        // Check of countdown af is (0 seconden OF negatief)
        if (distance <= 1000) { // Trigger wanneer minder dan 1 seconde over is
            console.log('⚠️ Distance is <= 1000ms, checken voor celebration...', distance);
            
            if (distance <= 1000 && !confettiTriggered) {
                console.log('✅ CELEBRATION TRIGGERED! Distance:', distance);
                
                document.getElementById('days').textContent = '00';
                document.getElementById('hours').textContent = '00';
                document.getElementById('minutes').textContent = '00';
                document.getElementById('seconds').textContent = '01'; // Toon 01 seconde
                
                // Voeg celebration effect toe
                const card = document.querySelector('.countdown-card');
                if (!card.classList.contains('celebration')) {
                    card.classList.add('celebration');
                    console.log('💚 Celebration class toegevoegd');
                    
                    // Voeg confetti slechts één keer toe
                    confettiTriggered = true;
                    console.log('🎉 Confetti triggeren in 300ms...');
                    setTimeout(() => {
                        console.log('🎉 CreateConfetti() wordt nu aangeroepen!');
                        createConfetti();
                    }, 300);
                }
            }
        } else {
            document.querySelector('.countdown-card').classList.remove('celebration');
            // Reset confetti flag als countdown weer verder gaat
            confettiTriggered = false;
        }
    }
}

// Update element met pulse animatie
function updateElementWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent);

    // Voeg alleen animatie toe als waarde veranderd is
    if (currentValue !== newValue) {
        element.classList.remove('pulse');
        // Trigger reflow om animatie opnieuw af te spelen
        void element.offsetWidth;
        element.classList.add('pulse');

        // Update inhoud
        element.textContent = String(newValue).padStart(2, '0');

        // Verwijder animatie class na completion
        setTimeout(() => {
            element.classList.remove('pulse');
        }, 500);
    }
}

// Initialiseer countdown
async function initCountdown() {
    // Laad betaaldagen data
    await loadPaydays();
    
    // Update onmiddellijk
    updateCountdown();
    
    // Update iedere seconde
    setInterval(updateCountdown, 1000);
}

// Zorg ervoor dat de pagina geladen is voordat je begint
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCountdown);
} else {
    initCountdown();
}

// Test functie - kan aangeroepen worden vanuit console
window.testConfetti = function() {
    console.log('🎉 TEST CONFETTI GESTART!');
    createConfetti();
};

console.log('💡 Tip: Typ testConfetti() in console om confetti te testen!');

// Voeg interactieve effecten toe bij muisbeweging
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.countdown-card, .motivation-card');
    const MAX_ROTATION = 30; // Maximaal 60 graden rotatie
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Subtle shine effect met limiet
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        let angleX = (y - centerY) / 10;
        let angleY = (x - centerX) / 10;
        
        // Limiet de rotatie
        angleX = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, angleX));
        angleY = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, angleY));

        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
    });
});

// Reset perspective wanneer muis de card verlaat
document.addEventListener('mouseleave', () => {
    const cards = document.querySelectorAll('.countdown-card, .motivation-card');
    cards.forEach(card => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
});

// Celebration effect voor betaaldag
const style = document.createElement('style');
style.textContent = `
    .countdown-card.celebration {
        animation: celebration-bounce 0.6s ease-out;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 20px 80px rgba(16, 185, 129, 0.6);
    }

    @keyframes celebration-bounce {
        0% {
            transform: scale(1) rotate(0deg);
        }
        50% {
            transform: scale(1.08) rotate(2deg);
        }
        100% {
            transform: scale(1) rotate(0deg);
        }
    }

    @keyframes confetti-fall {
        0% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0deg) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(600px) translateX(100px) rotate(720deg) scale(0.5);
        }
    }

    .confetti {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        font-size: 28px;
        animation: confetti-fall 4s ease-in forwards;
        line-height: 1;
    }
`;
document.head.appendChild(style);

// Confetti functie
function createConfetti() {
    const confettiElements = ['🎉', '💰', '🎊', '✨', '🥳', '🎈', '⭐', '🌟', '💸'];
    
    console.log('Confetti gestart!');
    
    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.textContent = confettiElements[Math.floor(Math.random() * confettiElements.length)];
        
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * 100 - 100; // Bovenaan scherm, niet zichtbaar
        const delay = (Math.random() * 0.3); // Kleinere delay
        const duration = 3 + Math.random() * 2;
        const xVariation = (Math.random() - 0.5) * 200; // Meer variatie
        
        confetti.style.left = startX + 'px';
        confetti.style.top = startY + 'px';
        confetti.style.animationDelay = delay + 's';
        confetti.style.animationDuration = duration + 's';
        
        // Extra transform voor meer variatie
        confetti.style.setProperty('--tx', xVariation + 'px');
        
        document.body.appendChild(confetti);
        
        // Verwijder element na animatie
        setTimeout(() => {
            if (confetti && confetti.parentNode) {
                confetti.remove();
            }
        }, (delay + duration) * 1000 + 200);
    }
}
