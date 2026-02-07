/**
 * Quote Generator
 * Creates and manages performance quotes for shows
 */

let show = null;
let showId = null;
let shows = [];

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
showId = urlParams.get('show');
const quoteId = urlParams.get('quote');
const isNew = urlParams.get('new') === 'true';

// UUID generator function
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Load show data from Firestore
async function loadShowData() {
    try {
        if (!window.FirestoreService) {
            throw new Error("Firebase not loaded");
        }

        shows = await window.FirestoreService.getShows();

        if (showId !== null) {
            show = shows.find(s => s.id === showId);
            if (show) {
                document.getElementById('show-name').textContent = `${show.venue} - ${show.date}`;

                if (quoteId && !isNew) {
                    await loadExistingQuote(quoteId);
                }
            } else {
                throw new Error(`Show with ID ${showId} not found`);
            }
        }
    } catch (error) {
        console.error('Error loading show:', error);
        alert(`Failed to load show data: ${error.message}`);
    }
}

// Load existing quote from Firestore
async function loadExistingQuote(quoteId) {
    try {
        if (!window.FirestoreService) {
            throw new Error("Firebase not loaded");
        }

        const quote = await window.FirestoreService.getQuote(quoteId);

        if (!quote) {
            throw new Error(`Quote not found: ${quoteId}`);
        }

        document.getElementById('duration').value = quote.duration;
        document.getElementById('members').value = quote.members;
        document.getElementById('musician-base').value = quote.musicianBase;
        document.getElementById('early-arrival').checked = quote.earlyArrival || false;
        document.getElementById('travel-distance').value = quote.travelDistance || 0;

        if (quote.lodging) {
            document.getElementById('lodging-required').checked = true;
            document.getElementById('lodging-rooms').value = quote.lodging.rooms;
            document.getElementById('room-rate').value = quote.lodging.roomRate;
            document.getElementById('lodging-section').classList.remove('hidden');
            document.getElementById('lodging-details').classList.remove('hidden');
        }

        if (quote.cocktailHour) {
            document.getElementById('cocktail-hour').checked = true;
            document.getElementById('cocktail-hours').value = quote.cocktailHour.hours;
            document.getElementById('cocktail-details').classList.remove('hidden');
        }

        if (quote.additionalAudio) {
            document.getElementById('additional-audio').checked = true;
            document.getElementById('audio-basic').value = quote.additionalAudio.basic || 0;
            document.getElementById('audio-premium').value = quote.additionalAudio.premium || 0;
            document.getElementById('audio-details').classList.remove('hidden');
        }

        if (quote.additionalMusicians) {
            document.getElementById('additional-musicians').checked = true;
            document.getElementById('musicians-count').value = quote.additionalMusicians.count || 0;
            document.getElementById('musician-rate').value = quote.additionalMusicians.rate || 0;
            document.getElementById('musicians-notes').value = quote.additionalMusicians.notes || '';
            document.getElementById('musicians-details').classList.remove('hidden');
        }

        if (quote.notes) {
            document.getElementById('quote-notes').value = quote.notes;
        }

        updateCalculations();
    } catch (error) {
        console.error('Error loading quote:', error);
        alert(`Failed to load quote: ${error.message}`);
    }
}

// Calculate musician base from operational agreement
function calculateMusicianBase(duration, members) {
    if (duration === 3) {
        if (members === 4) return 600;
        if (members === 5) return 750;
        if (members === 6) return 1000;
    } else if (duration === 4) {
        if (members === 4) return 640;
        if (members === 5) return 800;
        if (members === 6) return 1000;
    }
    return members * 150;
}

// Update all calculations
function updateCalculations() {
    const duration = parseInt(document.getElementById('duration').value);
    const members = parseInt(document.getElementById('members').value);
    const customRate = document.getElementById('custom-rate').checked;

    let musicianBase;
    if (customRate) {
        musicianBase = parseInt(document.getElementById('musician-base').value) || 0;
    } else {
        musicianBase = calculateMusicianBase(duration, members);
        document.getElementById('musician-base').value = musicianBase;
    }

    const earlyArrival = document.getElementById('early-arrival').checked;
    const travelDistance = parseInt(document.getElementById('travel-distance').value);

    updateRecommendation(duration, members, musicianBase);

    const travelCost = travelDistance > 0 ? (travelDistance * 60 * members) : 0;

    let lodgingCost = 0;
    if (document.getElementById('lodging-required').checked) {
        const rooms = parseInt(document.getElementById('lodging-rooms').value) || 0;
        const roomRate = parseInt(document.getElementById('room-rate').value) || 0;
        lodgingCost = rooms * roomRate;
    }

    let cocktailCost = 0;
    if (document.getElementById('cocktail-hour').checked) {
        const hours = parseFloat(document.getElementById('cocktail-hours').value) || 0;
        cocktailCost = hours * 300;
    }

    let audioCost = 0;
    if (document.getElementById('additional-audio').checked) {
        const basic = parseInt(document.getElementById('audio-basic').value) || 0;
        const premium = parseInt(document.getElementById('audio-premium').value) || 0;
        audioCost = (basic * 200) + (premium * 500);
    }

    let musiciansCost = 0;
    if (document.getElementById('additional-musicians').checked) {
        const count = parseInt(document.getElementById('musicians-count').value) || 0;
        const rate = parseInt(document.getElementById('musician-rate').value) || 0;
        musiciansCost = count * rate;
    }

    let total = musicianBase;
    if (earlyArrival) total += 300;
    total += travelCost;
    total += lodgingCost;
    total += cocktailCost;
    total += audioCost;
    total += musiciansCost;

    document.getElementById('summary-base').textContent = `$${musicianBase.toLocaleString()}`;
    document.getElementById('summary-early-row').style.display = earlyArrival ? 'flex' : 'none';

    if (travelCost > 0) {
        document.getElementById('summary-travel-row').style.display = 'flex';
        document.getElementById('summary-travel').textContent = `$${travelCost.toLocaleString()}`;
    } else {
        document.getElementById('summary-travel-row').style.display = 'none';
    }

    if (lodgingCost > 0) {
        document.getElementById('summary-lodging-row').style.display = 'flex';
        document.getElementById('summary-lodging').textContent = `$${lodgingCost.toLocaleString()}`;
    } else {
        document.getElementById('summary-lodging-row').style.display = 'none';
    }

    if (cocktailCost > 0) {
        document.getElementById('summary-cocktail-row').style.display = 'flex';
        document.getElementById('summary-cocktail').textContent = `$${cocktailCost.toLocaleString()}`;
    } else {
        document.getElementById('summary-cocktail-row').style.display = 'none';
    }

    if (audioCost > 0) {
        document.getElementById('summary-audio-row').style.display = 'flex';
        document.getElementById('summary-audio').textContent = `$${audioCost.toLocaleString()}`;
    } else {
        document.getElementById('summary-audio-row').style.display = 'none';
    }

    if (musiciansCost > 0) {
        document.getElementById('summary-musicians-row').style.display = 'flex';
        document.getElementById('summary-musicians').textContent = `$${musiciansCost.toLocaleString()}`;
    } else {
        document.getElementById('summary-musicians-row').style.display = 'none';
    }

    document.getElementById('total-quote').textContent = `$${total.toLocaleString()}`;

    const performanceRevenue = total - lodgingCost;
    const perMember = Math.round(performanceRevenue / members);
    document.getElementById('per-member').textContent = `$${perMember.toLocaleString()}`;
    document.getElementById('member-count').textContent = members;
}

// Update recommendation text
function updateRecommendation(duration, members, musicianBase) {
    const rec = document.getElementById('base-recommendation');
    const perMember = Math.round(musicianBase / members);
    const minimum = duration === 3 ? 150 : 160;

    if (document.getElementById('custom-rate').checked) {
        if (perMember < minimum) {
            rec.textContent = `Warning: Below minimum: $${minimum}/member for ${duration}hr`;
            rec.classList.add('text-red-400');
        } else {
            rec.textContent = `Custom rate: $${perMember}/member`;
            rec.classList.remove('text-red-400');
        }
    } else {
        rec.textContent = `Auto-calculated: $${perMember}/member (${duration}hr, ${members}-piece)`;
        rec.classList.remove('text-red-400');
    }
}

// Save quote to Firestore
async function saveQuote() {
    if (!show) {
        alert('No show data available');
        return;
    }

    if (!window.FirestoreService) {
        alert('Firebase not loaded');
        return;
    }

    if (!window.FirebaseAuth?.isAuthenticated()) {
        alert('Please sign in to save quotes');
        return;
    }

    const saveBtn = document.getElementById('save-quote-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        let quoteUuid;
        if (quoteId && !isNew) {
            quoteUuid = quoteId;
        } else {
            quoteUuid = generateUUID();
        }

        const quote = {
            id: quoteUuid,
            showId: showId,
            showVenue: show.venue,
            showDate: show.date,
            duration: parseInt(document.getElementById('duration').value),
            members: parseInt(document.getElementById('members').value),
            musicianBase: parseInt(document.getElementById('musician-base').value),
            earlyArrival: document.getElementById('early-arrival').checked,
            travelDistance: parseInt(document.getElementById('travel-distance').value),
            notes: document.getElementById('quote-notes').value,
            createdAt: new Date().toISOString(),
            total: parseInt(document.getElementById('total-quote').textContent.replace(/[$,]/g, ''))
        };

        if (document.getElementById('lodging-required').checked) {
            quote.lodging = {
                rooms: parseInt(document.getElementById('lodging-rooms').value),
                roomRate: parseInt(document.getElementById('room-rate').value)
            };
        }

        if (document.getElementById('cocktail-hour').checked) {
            quote.cocktailHour = {
                hours: parseFloat(document.getElementById('cocktail-hours').value)
            };
        }

        if (document.getElementById('additional-audio').checked) {
            quote.additionalAudio = {
                basic: parseInt(document.getElementById('audio-basic').value) || 0,
                premium: parseInt(document.getElementById('audio-premium').value) || 0
            };
        }

        if (document.getElementById('additional-musicians').checked) {
            quote.additionalMusicians = {
                count: parseInt(document.getElementById('musicians-count').value) || 0,
                rate: parseInt(document.getElementById('musician-rate').value) || 0,
                notes: document.getElementById('musicians-notes').value.trim()
            };
        }

        await window.FirestoreService.saveQuote(quote);

        show.quoteId = quoteUuid;
        await window.FirestoreService.saveShow(show);

        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
        setTimeout(() => {
            window.close();
        }, 1500);

    } catch (error) {
        console.error('Error saving quote:', error);
        alert(`Failed to save quote: ${error.message}`);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Quote';
    }
}

// PDF Download
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const duration = parseInt(document.getElementById('duration').value);
    const members = parseInt(document.getElementById('members').value);
    const musicianBase = parseInt(document.getElementById('musician-base').value) || 0;
    const earlyArrival = document.getElementById('early-arrival').checked;
    const travelDistance = parseInt(document.getElementById('travel-distance').value);
    const totalQuote = document.getElementById('total-quote').textContent;
    const perMember = document.getElementById('per-member').textContent;
    const notes = document.getElementById('quote-notes').value;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('ULTRAPHONICS', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text('Performance Quote', 105, 28, { align: 'center' });
    doc.text('(THIS FEATURE IS A WORK IN PROGRESS)', 105, 28, { align: 'center' });

    if (show) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`${show.venue}`, 105, 38, { align: 'center' });
        doc.text(`${show.date}`, 105, 44, { align: 'center' });
    }

    doc.setDrawColor(100, 100, 100);
    doc.line(20, 50, 190, 50);

    let yPos = 60;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Event Details', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Performance Duration: ${duration} hours`, 25, yPos);
    yPos += 6;
    doc.text(`Number of Band Members: ${members}`, 25, yPos);
    yPos += 6;
    if (earlyArrival) {
        doc.text(`Early Arrival Premium: Included`, 25, yPos);
        yPos += 6;
    }
    if (travelDistance > 0) {
        const travelLabels = ['Within 1.5 hours', '1.5 - 2.5 hours', '2.5 - 3.5 hours', '3.5 - 4.5 hours', '4.5+ hours'];
        doc.text(`Travel Distance: ${travelLabels[travelDistance]}`, 25, yPos);
        yPos += 6;
    }

    yPos += 4;

    let hasAddons = false;
    if (document.getElementById('cocktail-hour').checked) {
        if (!hasAddons) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Add-On Services', 20, yPos);
            yPos += 8;
            hasAddons = true;
        }
        const hours = parseFloat(document.getElementById('cocktail-hours').value);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Cocktail Hour Live Trio: ${hours} hour${hours !== 1 ? 's' : ''}`, 25, yPos);
        yPos += 6;
    }

    if (document.getElementById('additional-audio').checked) {
        if (!hasAddons) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Add-On Services', 20, yPos);
            yPos += 8;
            hasAddons = true;
        }
        const basic = parseInt(document.getElementById('audio-basic').value) || 0;
        const premium = parseInt(document.getElementById('audio-premium').value) || 0;
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        if (basic > 0) {
            doc.text(`Additional Audio (Basic): ${basic} location${basic !== 1 ? 's' : ''}`, 25, yPos);
            yPos += 6;
        }
        if (premium > 0) {
            doc.text(`Additional Audio (Premium): ${premium} location${premium !== 1 ? 's' : ''}`, 25, yPos);
            yPos += 6;
        }
    }

    if (document.getElementById('additional-musicians').checked) {
        if (!hasAddons) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Add-On Services', 20, yPos);
            yPos += 8;
            hasAddons = true;
        }
        const count = parseInt(document.getElementById('musicians-count').value) || 0;
        const musicianNotes = document.getElementById('musicians-notes').value.trim();
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Additional Musicians: ${count} musician${count !== 1 ? 's' : ''}`, 25, yPos);
        yPos += 6;
        if (musicianNotes) {
            const splitNotes = doc.splitTextToSize(musicianNotes, 160);
            doc.text(splitNotes, 25, yPos);
            yPos += (splitNotes.length * 6);
        }
    }

    if (hasAddons) yPos += 4;

    doc.setDrawColor(100, 100, 100);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Total Quote:', 20, yPos);
    doc.text(totalQuote, 190, yPos, { align: 'right' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Per Member: ${perMember}`, 20, yPos);
    yPos += 10;

    if (notes) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', 20, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const splitNotes = doc.splitTextToSize(notes, 170);
        doc.text(splitNotes, 20, yPos);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Ultraphonics Quote Generator', 105, 285, { align: 'center' });

    const filename = show ? `Ultraphonics_Quote_${show.venue.replace(/\s+/g, '_')}_${show.date.replace(/\//g, '-')}.pdf` : 'Ultraphonics_Quote.pdf';
    doc.save(filename);
}

// Firebase Auth Setup
function setupAuth() {
    const loginModal = document.getElementById('login-modal');
    const authLoading = document.getElementById('auth-loading');
    const googleSignInBtn = document.getElementById('google-sign-in-btn');
    const loginError = document.getElementById('login-error');

    function showLoginForm() {
        authLoading.classList.add('fade-out');
        setTimeout(() => {
            authLoading.style.display = 'none';
            loginModal.classList.remove('hidden');
        }, 300);
        loginError.classList.add('hidden');
    }

    function hideLoginModal() {
        authLoading.classList.add('fade-out');
        setTimeout(() => {
            authLoading.style.display = 'none';
        }, 300);
        loginModal.classList.add('hidden');
    }

    googleSignInBtn.addEventListener('click', async () => {
        googleSignInBtn.disabled = true;
        googleSignInBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
        loginError.classList.add('hidden');

        try {
            await window.FirebaseAuth.loginWithGoogle();
            hideLoginModal();
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = error.message || 'Sign in failed';
            loginError.classList.remove('hidden');
        } finally {
            googleSignInBtn.disabled = false;
            googleSignInBtn.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            `;
        }
    });

    window.FirebaseAuth.onAuthChange((user) => {
        if (!user) {
            showLoginForm();
        } else {
            hideLoginModal();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('duration').addEventListener('change', updateCalculations);
    document.getElementById('members').addEventListener('change', updateCalculations);

    document.getElementById('custom-rate').addEventListener('change', function() {
        const musicianBaseInput = document.getElementById('musician-base');
        if (this.checked) {
            musicianBaseInput.removeAttribute('readonly');
            musicianBaseInput.classList.add('bg-stone-800');
            musicianBaseInput.classList.remove('bg-stone-900');
        } else {
            musicianBaseInput.setAttribute('readonly', 'readonly');
            musicianBaseInput.classList.remove('bg-stone-800');
            musicianBaseInput.classList.add('bg-stone-900');
        }
        updateCalculations();
    });

    document.getElementById('musician-base').addEventListener('input', updateCalculations);
    document.getElementById('early-arrival').addEventListener('change', updateCalculations);

    document.getElementById('travel-distance').addEventListener('change', function() {
        const distance = parseInt(this.value);
        const lodgingSection = document.getElementById('lodging-section');
        if (distance >= 2) {
            lodgingSection.classList.remove('hidden');
        } else {
            lodgingSection.classList.add('hidden');
            document.getElementById('lodging-required').checked = false;
        }
        updateCalculations();
    });

    document.getElementById('lodging-required').addEventListener('change', function() {
        const details = document.getElementById('lodging-details');
        if (this.checked) {
            details.classList.remove('hidden');
        } else {
            details.classList.add('hidden');
        }
        updateCalculations();
    });

    document.getElementById('lodging-rooms').addEventListener('input', updateCalculations);
    document.getElementById('room-rate').addEventListener('input', updateCalculations);

    document.getElementById('cocktail-hour').addEventListener('change', function() {
        const details = document.getElementById('cocktail-details');
        if (this.checked) {
            details.classList.remove('hidden');
        } else {
            details.classList.add('hidden');
        }
        updateCalculations();
    });

    document.getElementById('cocktail-hours').addEventListener('input', updateCalculations);

    document.getElementById('additional-audio').addEventListener('change', function() {
        const details = document.getElementById('audio-details');
        if (this.checked) {
            details.classList.remove('hidden');
        } else {
            details.classList.add('hidden');
        }
        updateCalculations();
    });

    document.getElementById('audio-basic').addEventListener('input', updateCalculations);
    document.getElementById('audio-premium').addEventListener('input', updateCalculations);

    document.getElementById('additional-musicians').addEventListener('change', function() {
        const details = document.getElementById('musicians-details');
        if (this.checked) {
            details.classList.remove('hidden');
        } else {
            details.classList.add('hidden');
        }
        updateCalculations();
    });

    document.getElementById('musicians-count').addEventListener('input', updateCalculations);
    document.getElementById('musician-rate').addEventListener('input', updateCalculations);

    document.getElementById('save-quote-btn').addEventListener('click', saveQuote);
    document.getElementById('download-pdf-btn').addEventListener('click', downloadPDF);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupEventListeners();
    loadShowData();
    updateCalculations();
});
