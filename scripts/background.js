let API_DOMAIN = '';
const API_PATH = '/gateway';

const TEAM_DATA_LIST = 'team_data_list';
const TEAM_LIST_IN_ROOM = 'team_list_in_room';
const TEAM_MEMBER_LIST = 'team_member_list';

function setLocalStorage(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({[key]: value}, function () {
            console.log('store storage: ', key, value);
            resolve(value);
        });
    });
}

function getLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, function (result) {
            console.log('get storage: ', key, result);
            resolve(result);
        });
    });
}

function getTeamDataListFromLocalStorage(team_id_list) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(TEAM_DATA_LIST, function (result) {
            const team_data_list = [];
            team_id_list.forEach(function (team_id) {
                team_data_list.push(result[TEAM_DATA_LIST][team_id]);
            });
            resolve(team_data_list);
        });
    });
}

function getTeamMembersFromLocalStorage(team_id_list) {
    const keys = [];
    team_id_list.forEach(function (team_id) {
        const key = TEAM_MEMBER_LIST + '_' + team_id;
        keys.push(key);
    });
    return getLocalStorage(keys);
}

function loadTeamList(access_token) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const api_result = JSON.parse(xhr.responseText);
                let team_data_list = {};
                if (api_result.status.success) {
                    api_result.result.team_dat.children.forEach(function (a_term_data) {
                        team_data_list[a_term_data["id"]] = a_term_data;
                    });
                }
                resolve(team_data_list);
            }
        }
        const data = {
            _t: access_token
        };
        xhr.open('POST', API_DOMAIN + API_PATH + '/get_teams.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send('pdata=' + encodeURIComponent(JSON.stringify(data)));
    });
}

function loadTeamMember(access_token, team_data_list) {
    const call_funcs = [];
    Object.keys(team_data_list).forEach(function (team_id) {
        call_funcs.push(getTeamMembers(access_token, team_id));
    });
    return Promise.all(call_funcs);
}

function getTeamInRoom(access_token, room_id) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const api_result = JSON.parse(xhr.responseText);
                if (!api_result.status.success) {
                    reject(xhr);
                    return;
                }
                const team_id_list = [];
                api_result.result.room_dat[room_id].team_list.forEach(function (term_data) {
                    team_id_list.push(term_data.id);
                });
                console.log('team in room: ', team_id_list);
                const team_data_list = {
                    [room_id]: team_id_list,
                };
                const key = TEAM_LIST_IN_ROOM + '_' + room_id;
                chrome.storage.local.set({[key]: team_data_list}, function () {
                    resolve(team_id_list);
                });
            }
        }
        const data = {
            _t: access_token,
            room_id: room_id,
        };
        xhr.open('POST', API_DOMAIN + API_PATH + '/get_room_team_setting.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send('pdata=' + encodeURIComponent(JSON.stringify(data)));
    });
}

function getTeamMembers(access_token, team_id) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const api_result = JSON.parse(xhr.responseText);
                if (!api_result.status.success) {
                    reject(xhr);
                    return;
                }
                const member_list = [];
                Object.keys(api_result.result.team_members).forEach(key => member_list.push(api_result.result.team_members[key]));
                const key = TEAM_MEMBER_LIST + '_' + team_id;
                chrome.storage.local.set({[key]: member_list}, function () {
                    console.log('store ' + key, member_list);
                    resolve(member_list);
                });
            }
        }
        const data = {
            _t: access_token,
            team_id: team_id,
        };
        xhr.open('POST', API_DOMAIN + API_PATH + '/get_team_members.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send('pdata=' + encodeURIComponent(JSON.stringify(data)));
    });
}

function getAllTeamMembers(team_id_list) {
    return new Promise((resolve, reject) => {
        getTeamMembersFromLocalStorage(team_id_list).then(function (load_data) {
            const members = {};
            team_id_list.forEach(function (team_id) {
                const key = TEAM_MEMBER_LIST + '_' + team_id;
                members[team_id] = load_data[key];
            });
            resolve(members);
        });
    });
}

function getRoomMemberAccountIdList(access_token, room_id) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const api_result = JSON.parse(xhr.responseText);
                if (!api_result.status.success) {
                    reject(xhr);
                    return;
                }
                const room_account_id_list = api_result.result.room_dat[room_id].m;
                console.log('getRoomMemberAccountIdList', room_account_id_list);
                resolve(room_account_id_list);
            }
        }
        const data = {
            _t: access_token,
            m: [
                room_id,
            ],
        };
        xhr.open('POST', GET_ROOM_INFO_URL = API_DOMAIN + API_PATH + '/get_room_info.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send('pdata=' + encodeURIComponent(JSON.stringify(data)));
    });
}

function getAllData(access_token, room_id, team_id_list) {
    return Promise.all([
        getTeamDataListFromLocalStorage(team_id_list),
        getAllTeamMembers(team_id_list),
        getRoomMemberAccountIdList(access_token, room_id),
    ]);
}

function convertViewModel([team_data_list, term_member_list, room_member_account_id_list], content_script_callback) {
    console.log('convertViewModel team_data_list', team_data_list);
    console.log('convertViewModel term_member_list', term_member_list);
    console.log('convertViewModel room_member_account_id_list', room_member_account_id_list);
    const result = {};
    team_data_list.forEach(function (team_data) {
        const team_id = team_data['id'];
        const team_member_account_id_list_in_room = [];
        term_member_list[team_id].forEach(function (account_data) {
            if (account_data["aid"] in room_member_account_id_list) {
                team_member_account_id_list_in_room.push(account_data);
            }
        });
        if (team_member_account_id_list_in_room.length === 0) {
            // チームは設定しているが、全員グループチャットから退席している
            return true;
        }
        result[team_id] = {
            name: team_data['name'],
            members: team_member_account_id_list_in_room,
        };
    });

    content_script_callback(result);
}

function onRequest(request, sender, content_script_callback) {
    API_DOMAIN = request.uri_origin;
    console.log("API_DOMAIN", API_DOMAIN);
    if (request.action === 'initTeamData') {
        loadTeamList(request.access_token)
            .then((team_data_list) => setLocalStorage(TEAM_DATA_LIST, team_data_list))
            .then(() => getLocalStorage(TEAM_DATA_LIST))
            .then((load_data) => loadTeamMember(request.access_token, load_data[TEAM_DATA_LIST]))
            .then(() => content_script_callback())
        ;
    }
    if (request.action === 'getTeamInRoom') {
        loadTeamList(request.access_token)
            .then(() => getTeamInRoom(request.access_token, request.room_id))
            .then((team_id_list) => getAllData(request.access_token, request.room_id, team_id_list))
            .then((all_team_data) => convertViewModel(all_team_data, content_script_callback))
        ;
    }
}

chrome.cookies.getAll({domain: API_DOMAIN}, ((cookies) => {
    console.log("Got cookies:", cookies);
}));

chrome.extension.onRequest.addListener(onRequest);
