const supabaseUrl = 'https://ptnvktizdkqmjdwushqe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnZrdGl6ZGtxbWpkd3VzaHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3NDAyMzcsImV4cCI6MjA1NDMxNjIzN30.Ao0Cac0DAx2Qp4xbKz0f1hijsPV2OdVEq3On9IFX3Tw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        storage: window.sessionStorage,
    },
});

function showPage(pageId) {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('signup-page').style.display = 'none';
    document.getElementById('profile-page').style.display = 'none';
    document.getElementById(pageId).style.display = 'block';
}

async function fetchProfileData(user) {
    const { data, error } = await supabase
        .from('profiles')
        .select('name, designation, scale_of_pay')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Profile fetch error:', error);
        return;
    }

    document.getElementById('profile-name').textContent = data.name;
    document.getElementById('profile-designation').textContent = data.designation;
    document.getElementById('profile-scale-of-pay').textContent = data.scale_of_pay;

    document.getElementById('edit-profile-name').value = data.name;
    document.getElementById('edit-profile-designation').value = data.designation;
    document.getElementById('edit-profile-scale').value = data.scale_of_pay;
}

async function fetchTravelLogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('travel_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

    if (error) {
        console.error('Travel Logs fetch error:', error);
        return;
    }

    const travelLogsList = document.getElementById('travel-logs-list');
    travelLogsList.innerHTML = '';

    data.forEach(log => {
        const row = document.createElement('tr');
        const isSpecialEntry = log.purpose === 'Public Holiday' || log.purpose === 'Casual Leave';

        row.innerHTML = `
            <td>${log.date}</td>
            <td>${isSpecialEntry ? '-' : log.place_from}</td>
            <td>${isSpecialEntry ? '-' : log.place_to}</td>
            <td>${isSpecialEntry ? '-' : log.time_in}</td>
            <td>${isSpecialEntry ? '-' : log.time_out}</td>
            <td>${isSpecialEntry ? '-' : log.distance_or_mode}</td>
            <td class="${isSpecialEntry ? 'text-danger fw-bold' : ''}">${log.purpose}</td>
        `;
        travelLogsList.appendChild(row);
    });
}

async function showProfilePage(user) {
    showPage('profile-page');
    await fetchProfileData(user);
    await fetchTravelLogs();
}

async function showLoginPage() {
    showPage('login-page');
}

document.addEventListener('DOMContentLoaded', async function () {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        await showProfilePage(user);
    } else {
        showLoginPage();
    }

    document.getElementById('go-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('signup-page');
    });

    document.getElementById('go-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginPage();
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target['signup-name'].value;
        const email = e.target['signup-email'].value;
        const password = e.target['signup-password'].value;
        const confirmPassword = e.target['signup-confirm-password'].value;
        const designation = e.target['signup-designation'].value;
        const scaleOfPay = e.target['signup-scale-of-pay'].value;

        if (password !== confirmPassword) return alert('Passwords do not match!');

        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) return alert(error.message);

        await supabase.from('profiles').insert([{ id: data.user.id, name, designation, scale_of_pay: scaleOfPay }]);

        Swal.fire('Success', 'Check your email for verification.', 'success');
        showLoginPage();
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target['login-email'].value;
        const password = e.target['login-password'].value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return alert(error.message);

        await showProfilePage(data.user);
    });

    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
        showLoginPage();
    });

    document.getElementById('edit-profile-button').addEventListener('click', () => {
        const editProfileForm = document.getElementById('edit-profile-form');
        editProfileForm.style.display = editProfileForm.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const name = document.getElementById('edit-profile-name').value;
        const designation = document.getElementById('edit-profile-designation').value;
        const scaleOfPay = document.getElementById('edit-profile-scale').value;

        const { error } = await supabase
            .from('profiles')
            .update({ name, designation, scale_of_pay: scaleOfPay })
            .eq('id', user.id);

        if (error) {
            alert('Profile update failed: ' + error.message);
        } else {
            const { error: userError } = await supabase.auth.updateUser({
                data: { name },
            });

            if (userError) {
                console.error('Session metadata update error:', userError.message);
            }

            alert('Profile updated successfully!');
            document.getElementById('profile-name').textContent = name;
            document.getElementById('profile-designation').textContent = designation;
            document.getElementById('profile-scale-of-pay').textContent = scaleOfPay;

            document.getElementById('edit-profile-form').style.display = 'none';
        }
    });

    document.getElementById('travel-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const date = document.getElementById('travel-date').value;
        const placeFrom = document.getElementById('place-from').value;
        const placeTo = document.getElementById('place-to').value;
        const timeIn = document.getElementById('time-in').value;
        const timeOut = document.getElementById('time-out').value;
        const distanceOrMode = document.getElementById('distance-or-mode').value;
        const purpose = document.getElementById('purpose').value;

        if (!date || !placeFrom || !placeTo || !timeIn || !timeOut || !distanceOrMode || !purpose) {
            alert('All fields are required!');
            return;
        }

        const isSpecialEntry = purpose === 'Public Holiday' || purpose === 'Casual Leave';
        const travelLog = {
            user_id: user.id,
            date,
            place_from: isSpecialEntry ? '-' : placeFrom,
            place_to: isSpecialEntry ? '-' : placeTo,
            time_in: isSpecialEntry ? '-' : timeIn,
            time_out: isSpecialEntry ? '-' : timeOut,
            distance_or_mode: isSpecialEntry ? '-' : distanceOrMode,
            purpose,
        };

        const { error } = await supabase
            .from('travel_logs')
            .insert([travelLog]);

        if (error) {
            alert('Failed to add travel log: ' + error.message);
        } else {
            alert('Travel log added successfully!');
            e.target.reset();
            await fetchTravelLogs();
        }
    });

    document.getElementById('download-excel-button').addEventListener('click', function () {
        Swal.fire({
            title: 'Enter Month and Year',
            html: `<input type="text" id="monthInput" class="swal2-input" placeholder="Month (e.g., February)">
                   <input type="text" id="yearInput" class="swal2-input" placeholder="Year (e.g., 2024)">`,
            showCancelButton: true,
            confirmButtonText: 'Download',
            preConfirm: () => {
                const month = document.getElementById('monthInput').value;
                const year = document.getElementById('yearInput').value;
                if (!month || !year) {
                    Swal.showValidationMessage('Month and Year are required');
                }
                return { month, year };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { month, year } = result.value;
                downloadExcel(month, year);
            }
        });
    });

    function downloadExcel(month, year) {
        const tableRows = document.querySelectorAll('#travel-logs-list tr');
        const data = [['Date', 'Place From', 'Place To', 'Time In', 'Time Out', 'Distance/Mode', 'Purpose']];

        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowData = Array.from(cells).map(cell => cell.innerText);
            data.push(rowData);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Travel Logs');

        const filename = `Travel_Logs_${month}_${year}.xlsx`;
        XLSX.writeFile(workbook, filename);
    }
});