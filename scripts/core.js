$(function () {
    $(window).bind('load', onLoad);
    // チャットルームの変更
    $(window).bind('hashchange', onChangeChatRoom);

    /**
     * エントリーポイント
     * チャットルーム表示したときに呼ばれる
     */
    function onLoad() {
        const timer = setInterval(onLoadJavascript, 200);

        function onLoadJavascript() {
            if ($('_chatText') !== null) {
                console.log('onLoad');
                findAccessToken();
                initTeamData(function (){
                    initTeamDataInRoom();
                });
                clearInterval(timer);
            }
        }
    }

    /**
     * URLフラグメント変更(チャットルーム変更)されたときに呼ばれる
     */
    function onChangeChatRoom()
    {
        console.log('onChangeChatRoom');
        findAccessToken();
        initTeamDataInRoom();
    }

    function findAccessToken()
    {
        const runSiteJavaScript = function (script) {
            location.href = "javascript: setTimeout(" + script.toString() + ", 0);";
        }

        const func = function () {
            if (document.getElementById("extension-access-token") === null) {
                var el = document.createElement("div");
                el.setAttribute('id', 'extension-access-token');
                el.setAttribute('data-href', window.ACCESS_TOKEN);
                document.body.appendChild(el);
            }
        }

        runSiteJavaScript(func);
    }

    /**
     * API へのアクセストークンを取得する
     * @returns {string}
     */
    function getAccessToken() {
        var el = document.getElementById("extension-access-token");
        return el.getAttribute("data-href");
    }

    /**
     * 現在のチャットルームに設定されているチーム情報を初期化する
     */
    function initTeamData(callback) {
        const timer = setInterval(onLoadContentsScript, 200);

        function onLoadContentsScript() {
            if (document.getElementById("extension-access-token") !== null) {
                clearInterval(timer);
                var access_token = getAccessToken();
                chrome.extension.sendRequest({
                    'action': 'initTeamData',
                    'uri_origin': (new URL(window.location.href)).origin,
                    'access_token': access_token,
                }, callback);
            }
        }
    }

    function initTeamDataInRoom()
    {
        const timer = setInterval(onLoadContentsScript, 200);

        function onLoadContentsScript() {
            if (document.getElementById("extension-access-token") !== null) {
                clearInterval(timer);
                var access_token = getAccessToken();
                // 今のルーム #!rid11111111
                var current_room_id = parseInt(window.location.hash.substr(5));
                window.console.log('現在のルームID: ' + current_room_id);

                chrome.extension.sendRequest({
                    'action': 'getTeamInRoom',
                    'uri_origin': (new URL(window.location.href)).origin,
                    'access_token': access_token,
                    'room_id': current_room_id,
                }, onLoadTeamInRoom);
            }
        }
    }

    /**
     * 現在のチャットルームに設定されているチーム情報をロードしたときのリスナ
     *
     * @param room_team_data
     */
    function onLoadTeamInRoom(room_team_data) {
        console.log('チームデータをロードしました: ', room_team_data);
        initButtons();
        setTeamMentionListToToolTip(room_team_data);
    }

    /**
     * 一度限り、チームボタン、チームメンションツールチップ要素を初期化する
     */
    function initButtons() {
        if (document.getElementById("_mentionTeamText") === null) {
            const team_mention_button = createButtonElement({
                id: "_mentionTeamText",
                label: "チームに To します",
                iconCls: "icoFontContact"
            });

            const chat_tool_bar_element = document.querySelectorAll('#_chatSendArea ul')[0];
            chat_tool_bar_element.appendChild(team_mention_button);
        }

        initTeamMentionToolTip();
        if (document.getElementById("_toTeamList") !== null) {
            // ツールチップ枠外をクリックしたら閉じる
            $(document).on('click', function (e) {
                if (!$(e.target).closest('#_toTeamList').length && !$(e.target).closest('#_mentionTeamText').length) {
                    $('#_toTeamList').fadeOut();
                }
            });
        }
    }

    /*
     * チームメンションボタン生成
     */
    function createButtonElement(args) {
        const li_element = document.createElement("li");
        li_element.setAttribute("role", "button");
        li_element.className = "_showDescription chatInput__emoticon";
        li_element.style.display = "inline-block";

        li_element.id = args.id;
        li_element.setAttribute("aria-label", args.label);

        const inner_element = document.createElement("span");
        inner_element.className = args.iconCls;
        inner_element.style = "padding-bottom: 2px;margin-right: 8px;";

        li_element.appendChild(inner_element);

        return li_element;
    }

    /**
     * チームメンションボタン押下時に開くツールチップ要素生成
     */
    function initTeamMentionToolTip() {
        if (document.getElementById("_toTeamList") === null) {
            const html_colde =
                '<div id="_toTeamList" class="toSelectorTooltip tooltip tooltip--white" role="tooltip" style="display: none; opacity: 1; z-index: 2;"><div class="_cwTTTriangle tooltipTriangle tooltipTriangle--whiteBottom"></div>\n' +
                '   <ul class="_cwLTList tooltipList" role="list" style="max-height: 160px; height: 160px;"></ul>' +
                '</div>';
            const div_element = document.createElement("div");
            div_element.innerHTML = html_colde;

            document.getElementById("_wrapper").appendChild(div_element);
        }

        // チームメンションボタンを押したときにツールチップを開く
        const team_mention_button = document.getElementById("_mentionTeamText");
        team_mention_button.addEventListener("click", function () {
            const button_position = $('#_mentionTeamText').offset();
            console.log('ボタン位置', button_position);
            $('#_toTeamList')
                .show()
                .offset({
                    top: button_position.top - 180,
                    left: button_position.left,
                });
        }, false);

        // 現在設定されているリストをクリア
        $("#_toTeamList ul").empty();
    }

    /**
     * チームメンションボタン押下時に開くツールチップにメンションリスト要素を設定する
     */
    function setTeamMentionListToToolTip(room_team_data) {
        if (document.getElementById("_toTeamList") === null) {
            console.log("チームメンションのツールチップが生成されていません");
            return;
        }
        Object.keys(room_team_data).forEach(function (team_id) {
                const li_element = createListElement(team_id, room_team_data[team_id]);
                $('#_toTeamList ul').append(li_element);
            }
        );
    }

    /**
     * チームメンションボタン押下時に開くツールチップの中のリスト要素を作成する
     *
     * @param task_id
     * @param team_data
     * @returns {HTMLLIElement}
     */
    function createListElement(task_id, team_data) {
        const li_element = document.createElement("li");
        li_element.innerHTML = '<li role="listitem" class="tooltipList__item"></li>';

        const p_element = document.createElement("p");
        p_element.innerHTML = '<p class="autotrim"></p>';
        p_element.innerText = '👥 ' + team_data.name;

        li_element.appendChild(p_element);

        const mention_string = createMentionString(team_data.name, team_data.members);
        li_element.setAttribute('data-mention-text', mention_string);

        // クリックしたらチームメンバーへの To を展開して入力
        li_element.addEventListener('click', function () {
            const text_element = document.getElementById("_chatText");
            const old_text = text_element.value;

            const start_point = text_element.selectionStart;
            const end_point = text_element.selectionEnd;

            const mention_text = this.getAttribute('data-mention-text');

            const new_point = start_point + mention_text.length;

            text_element.value = old_text.substr(0, start_point) + mention_text + old_text.substr(end_point);

            text_element.setSelectionRange(new_point, new_point);
            text_element.focus();

            // ツールチップを閉じる
            $('#_toTeamList').fadeOut();
        });

        return li_element;
    }

    /**
     * チームメンションボタン押下時に開くツールチップの中のリスト要素をクリックしたときに、入力する文字列を生成する
     * @param team_name
     * @param team_members
     * @returns {string}
     */
    function createMentionString(team_name, team_members) {
        let data = 'To: ' + team_name + '\n';
        team_members.forEach(function (member) {
            data += ' [To:' + member.aid + ']';
        });
        data += '\n';
        return data;
    }
});
