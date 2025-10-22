const asideButton = document.getElementById('toggleSideBar');
const asideMenuTittle = document.getElementById('side-bar-name');

document.getElementById("toggleSideBar").addEventListener('click', (event) => {
    event.preventDefault();
    const collapsed = document.body.classList.toggle('collapsed');
    asideMenuTittle.classList.toggle('hidden');

    asideButton.dataset.state = collapsed ? "collapsed" : "expanded";
    asideButton.textContent = collapsed ? "⮞" : "⮜";

});

const profileButton = document.getElementById("profile-button");
const profileMenuDropdown = document.getElementById("profile-menu-dropdown");

profileButton.addEventListener('click', (event) => {
    event.preventDefault();
    profileMenuDropdown.classList.toggle('hidden')
});

document.addEventListener('click', (event) => {
    if (profileButton.contains(event.target) && profileMenuDropdown.contains(event.target)) {
        profileMenuDropdown.classList.toggle('hidden');
    }

})





/**
 * initSideBar && 
*/
async function initSideBar() {
    const BASE_URL = window.location.origin;

    try {
        const token = checkAuth();

        const res = await fetch('/api/users/me', {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            throw new Error("Falha ao obter dados do usuario");
        }
        const data = await res.json();

        document.getElementById('user-name').innerHTML = data.user.first_name;

        const tabList = document.getElementById('tab-list');
        tabList.innerHTML = '';

        data.allowed_tabs.forEach(tab => {
            if (tab === 'supplies_variation' || tab === 'profile') {
                return;
            }

            const li = document.createElement('li');
            const linkA = document.createElement('a');
            const div = document.createElement('div');

            li.classList.add('menu-list-item');
            div.classList.add('menu-submenu-title');

            linkA.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);

            if (tab === 'supplies') {
                linkA.href = `${BASE_URL}/supplies/${tab}.html`;
            } else if (tab === 'inicio') {
                linkA.href = `${BASE_URL}/index.html`;
            } else {
                linkA.href = `${BASE_URL}/${tab}.html`
            }

            li.appendChild(div);
            div.appendChild(linkA);
            tabList.appendChild(li);

        });

    } catch (error) {
        console.error(error);
        alert('Falha ao carregar a barra de navegação');
    }
}

async function loadAnnouncement() {
    try {
        const res = await fetch('/api/ann', {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        const ann = document.getElementById('announcement');
        ann.textContent = data.message;
        if (data.link) {
            ann.style.cursor = 'pointer';
            ann.onclick = () => window.location.href = data.link;
        }

    } catch (error) {
        console.error('Erro ao carregar o aviso', error);
    }
}


/**
 * STANDALONE FUNCTIONS
*/
function logOut() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
function goToSupplies() {
    window.location.href = '/supplies/supplies.html';
}
function goToProfile() {
    window.location.href = '/profile.html';
}
function goBack() {
    window.history.back();
}



async function saveAnnouncement() {
    try {
        const message = document.getElementById('announcement-msg').value;
        const link = document.getElementById('announcement-link').value;

        const res = await fetch('/api/ann', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, link })
        });

        if (res.ok) {
            alert('Aviso atualizado');
        } else {
            alert('Erro ao atualizar aviso')
        }
        loadAnnouncement();
    } catch (error) {
        console.error(error);
    }
}