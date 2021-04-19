// var vConsole = new VConsole();

function get_title(text) {
    return text.trimLeft().split("\n")[0].slice(0,36)
}

var the_vue = new Vue({
    el: '#app',
    data: {
        "app_name": "MyNote",
        "fields": ["lean_cloud_keys_str", "user", "settings", "status", "ui", "editor"],
        //
        "hash": "",
        "lean_cloud_keys_str": "",
        "lean_cloud_keys": {
            appId: "",
            appKey: "",
            serverURL: "",
        },
        "user": {
            username: "",
            password: "",
        },
        //
        "notes": [],
        //
        "status": {
            username: "",
            lc_initiated: false,
            logged_in: false,
            current_page: 0,
            current_tab: 0,
            loginning: false,
        },
        "ready": false,
        "store_enabled": true,
        "settings": {
            remember_keys: true,
            remember_user: true,
            dark_mode: false,
            dark_mode_follow_system: true,
        },
        //
        "pages": ["login", "main", "welcome", "settings", "add_post_gzh", "please" ,"edit"],
        "tabs": [
            {
                name: "notes",
                icon: "sticky-note",
                idx: 0,
                active: true,
                msg_num: 0,
                show_num: true,
            },
            {
                name: "tools",
                // icon: "gem",
                // icon: "hdd",
                // icon: "heart",
                // icon: "star-half",
                // icon: "star",
                icon: "lightbulb",
                idx: 1,
                active: false,
                msg_num: 0,
                show_num: false,
            },
            {
                name: "me",
                icon: "user",
                idx: 2,
                active: false,
                msg_num: 0,
                show_num: false,
            },
        ],
        "ui": {
            tab_current: 0,
            toasts_last_idx: 1,
            toasts: [],
            toptips_last_idx: 1,
            toptips: [],
        },
        "editor": {
            objectId: "",
            content: "",
            owner: "",
            tags: [],
            is_draft: false,
            pinned: false,
            deleted: false,
        },
        "tools_gzh": {
            url: "",
            is_analyzing: false,
            is_analyzed: false,
            result: null,
            result_text: "",
            result_obj: {},
        },
        //
    },
    computed: {
        dark_mode: function() {
            let self = this;
            return self.settings.dark_mode;
        },
        // hash: function() {
        //     let self = this;
        //     return location.hash;
        // },
    },


    methods: {

        sync: function() {
            let self = this;
            let Note = LC.CLASS("Note");
            return Note.orderBy(["createdAt", "updatedAt", "content"]).find()
            .then((x) => {
                self.notes = x;
                self.push_toptip('success', `笔记清单同步成功`);
            })
            .catch(({ error }) => self.push_toptip('warn', error));
        },

        editor_save: function() {
            let self = this;
            let note = {
                content: self.editor.content,
                owner: LC.User.current(),
                // is_draft: self.editor.is_draft,
                // pinned: self.editor.pinned,
                // deleted: self.editor.deleted,
            };
            let Note = LC.CLASS("Note");
            if (self.editor.objectId) {
                let that = Note.object(self.editor.objectId);
                return that.update(note)
                .then((x)=>{
                    self.push_toptip('success', `成功更新笔记「${x.objectId}」`, 500);
                    return Note.object(x.objectId).get();
                })
                .then((x)=>{
                    self.editor.objectId = x.objectId;
                    self.notes = self.notes.filter(y=>y.objectId!=x.objectId);
                    self.notes.push(x);
                    self.notes.sort((a,b)=>{return b.updatedAt - a.updatedAt});
                    self.go_hash("notes");
                })
                .catch(({ error }) => self.push_toptip('warn', error));
            } else {
                return Note.add(note)
                .then((x)=>{
                    self.push_toptip('success', `成功创建笔记「${x.objectId}」`, 500);
                    return Note.object(x.objectId).get();
                })
                .then((x)=>{
                    self.editor.objectId = x.objectId;
                    self.notes.push(x);
                    self.notes.sort((a,b)=>{return b.updatedAt - a.updatedAt});
                    self.go_hash("notes");
                })
                .catch(({ error }) => self.push_toptip('warn', error));
            };
        },

        go_tab: function(x) {
            let self = this;
            location.hash=`#${self.tabs[x].name}`;
            self.tabs.forEach(pp => {
                pp.active = pp.idx == x;
            });
            self.ui.tab_current = x;
            self.status.current_page = 1;
        },

        go_hash: function(hash) {
            let self = this;
            // console.log(`go to: ${hash}`);
            let _map = {
                'notes': function() {
                    self.go_tab(0);
                },
                'tools': function() {
                    self.go_tab(1);
                },
                'me': function() {
                    self.go_tab(2);
                },
                'page-login': function() {
                    self.status.current_page = 0;
                    // alert(`这里是${self.status.current_page}`);
                    // setTimeout(()=>{alert(`现在这里是${self.status.current_page}`);}, 2000);
                },
                "page-add_post_gzh": function() {
                    self.tools_gzh= {
                        url: "",
                        is_analyzing: false,
                        is_analyzed: false,
                        result: null,
                        result_text: "",
                        result_obj: {},
                    };
                    self.status.current_page = 4;
                },
                "page-please": function() {
                    self.status.current_page = 5;
                },
                'page-edit': function() {
                    self.editor.objectId = "";
                    self.editor.contentOld = self.editor.content;
                    self.editor.content = "";
                    self.status.current_page = 6;
                },
            };
            if (self.status.logged_in) {
                if (hash in _map) {
                    _map[hash]();
                    location.hash = hash;
                } else if (hash.slice(0,4)=="post") {
                    let noteID = hash.slice(5, hash.length);
                    self.push_toptip('info', `${noteID}`);
                    //
                    let xx = self.notes.filter(x=>x.objectId==noteID)[0];
                    if (xx) {
                        xxx = xx.data;
                        xxx.contentOld = xxx.content;
                        xxx.objectId = xx.objectId;
                        xxx.createdAt = xx.createdAt;
                        xxx.updatedAt = xx.updatedAt;
                        self.editor = xxx;
                    } else {
                        self.editor.objectId = "";
                    };
                    self.status.current_page = 6;
                    location.hash = hash;
                } else {
                    self.go_hash(`notes`);
                    location.hash = `notes`;
                };
            } else {
                _map['page-login']();
                location.hash = `page-login`;
            };
        },

        login: function() {
            let self = this;
            self.status.loginning = true;
            if (!self.status.lc_initiated) {
                try {
                    let ll = self.lean_cloud_keys_str.trim().split(" ");
                    if (ll.length != 3) {
                        self.status.loginning = false;
                        self.push_toast('danger', `LeanCloud字符串可能不正确`, 2000);
                        return null;
                    };
                    self.lean_cloud_keys = {
                        appId: ll[0],
                        appKey: ll[1],
                        serverURL: ll[2],
                    };
                } catch(error) {
                    self.status.loginning = false;
                    self.push_toast('danger', `LeanCloud字符串分析出错`, 2000);
                    return null;
                };
                try {
                    LC.init(self.lean_cloud_keys);
                    self.status.lc_initiated = true;
                } catch(error) {
                    self.status.loginning = false;
                    self.push_toast('info', `${error}`, 2000);
                };
            };
            LC.User.login(self.user.username, self.user.password)
            .then((x) => {
                self.status.username = self.user.username;
                self.status.loginning = false;
                self.sync();
                self.push_toast('success', `你好，${LC.User.current().data.username}，登录成功啦！`, 1000);
                self.status.logged_in = true;
                self.user.password = '';
                self.user.username = self.settings.remember_user ? self.user.username : '';
                self.lean_cloud_keys_str = self.settings.remember_keys ? self.lean_cloud_keys_str : '';
                self.go_hash('notes');
                // self.refresh();
            }).catch(({ error }) => {
                self.status.username = "";
                self.status.loginning = false;
                self.push_toptip('danger', error, 3000);
                self.user.password = '';
                self.user.username = self.settings.remember_user ? self.user.username : '';
                self.lean_cloud_keys_str = self.settings.remember_keys ? self.lean_cloud_keys_str : '';
            });
        },

        logOut: function() {
            let self = this;
            LC.User.logOut();
            self.push_toast('text', `再见${self.status.username}！`);
            self.status.username = "";
            self.user.password = "";
            self.status.logged_in = false;
            self.go_hash("page-login");
            // self.refresh();
            location.reload();
        },

        tools_gzh_check_url() {
            let self = this;
            return 0 == self.tools_gzh.url.search(/^(https?:\/\/)?mp\.weixin\.qq\.com/);
        },

        tools_gzh_analyze() {
            let self = this;
            let setting = {
                "meta": [
                    {
                        "selector": "h2#activity-name",
                        "output_map": {
                            "class": "meta",
                            "meta_key": "title",
                            "meta_value": "__text"
                        }
                    },
                    {
                        "selector": "#profileBt #js_name",
                        "output_map": {
                            "class": "meta",
                            "meta_key": "channel",
                            "meta_value": "__text"
                        }
                    },
                    {
                        "selector": "meta[name=author]",
                        "output_map": {
                            "class": "meta",
                            "meta_key": "author",
                            "meta_value": "@content"
                        }
                    },
                    {
                        "selector": "meta[name=description]",
                        "output_map": {
                            "class": "meta",
                            "meta_key": "description",
                            "meta_value": "@content"
                        }
                    }//,
                    // {
                    //     "selector": "meta[property]",
                    //     "output_map": {
                    //         "class": "meta",
                    //         "meta_key": "@property",
                    //         "meta_value": "@content"
                    //     }
                    // }
                ],
                "content": [
                    {
                        "selector": "#js_content",
                        "output_map": {
                            "class": "article_field",
                            "meta_key": "abstract",
                            "meta_value": "__text_abstract"
                        }
                    }//,
                    // {
                    //     "selector": "#js_content",
                    //     "output_map": {
                    //         "class": "article_field",
                    //         "meta_key": "full_content",
                    //         "meta_value": "__strings"
                    //     }
                    // }
                ]//,
                // "image": [
                //     {
                //         "selector": "img[data-src]",
                //         "output_map": {
                //             "class": "image",
                //             "href": "@data-src"
                //         }
                //     }
                // ]
            };
            // let setting_string = JSON.stringify(setting);
            let paramsJson = {
                url: self.tools_gzh.url,
                setting: setting,
            }
            self.tools_gzh.is_analyzing = true;
            LC.Cloud.run('spy', paramsJson).then((result)=>{
                self.tools_gzh.result = result;
                self.tools_gzh.result_obj = {
                    title: result.meta[0].meta_value,
                    channel: result.meta[1].meta_value,
                    author: result.meta[2].meta_value,
                    description: result.meta[3].meta_value,
                    abstract: result.content[0].meta_value,
                };
                self.tools_gzh.result_text = JSON.stringify(self.tools_gzh.result_obj);
                self.tools_gzh.is_analyzing = false;
                self.tools_gzh.is_analyzed = true;
                console.log(self.tools_gzh.result);
            }).catch(({ error }) => {
                self.tools_gzh.is_analyzing = false;
                self.push_toast('danger', `分析时发生错误：「${error}」。`);
            });
        },




        refresh: async function() {
            let self = this;
            self.scores = [];
            self.ss = {"1": {"1": [], "2": [], "3": [], }, "2": {"1": [], "2": [], "3": [], }, };
            //
            if (1) {
                return Score.find()
                .then((x)=>{
                    x.forEach(xx=>{
                        let data = xx.data;
                        let da = {
                            team_name: data.team_name,
                            institution: data.institution,
                            which_set: data.which_set,
                            task1_Acc: data.performance.task1.Accuracy,
                            task2_Acc: data.performance.task2.Accuracy,
                            task3_F1: data.performance.task3.F1,
                            submittedAt: data.submittedAt,
                        };
                        self.scores.push(da);
                        self.ss[da.which_set][1].push(da.task1_Acc);
                        self.ss[da.which_set][2].push(da.task2_Acc);
                        self.ss[da.which_set][3].push(da.task3_F1);
                    });
                    // self.push_toast('info', `成功读取排行榜。`);
                })
                .then(()=>{
                    self.scores.forEach(da=>{
                        let p1 = self.zs()[`${da.which_set}`]["1"];
                        let p2 = self.zs()[`${da.which_set}`]["2"];
                        let p3 = self.zs()[`${da.which_set}`]["3"];
                        console.log([p1, p2, p3]);
                        da.task1_Z = zScore(da.task1_Acc, p1.mean, p1.std);
                        da.task2_Z = zScore(da.task2_Acc, p2.mean, p2.std);
                        da.task3_Z = zScore(da.task3_F1, p3.mean, p3.std);
                        da.Z_mean = foo([da.task1_Z, da.task2_Z, da.task3_Z]).mean;
                    });
                    self.scores.sort((a, b)=>{return b.Z_mean - a.Z_mean});
                    //
                    self.final_dict = {"1": {}, "2": {}, };
                    let final_dict = self.final_dict;
                    let final_scores = {"1": [], "2": [], };
                    self.scores.forEach(da=>{
                        if (da.team_name in final_dict[`${da.which_set}`]) {
                            self.push_toast('warning', `「${da.team_name}」的非最佳成绩被排除。`);
                        } else {
                            final_dict[`${da.which_set}`][da.team_name] = da;
                            final_scores[`${da.which_set}`].push(da);
                        };
                    });
                    //
                    let oo = 1;
                    self.scores.forEach(da=>{da.order = oo; oo++});
                    self.push_toast('info', `成功读取排行榜。`);
                    // self.push_toast('info', `Z分数计算成功。`);
                })
                .catch(({ error }) => self.push_toast('danger', `读取排行榜时发生错误：「${error}」。`));
            };
            // return greeting = await Promise.resolve("Hello");
        },

        push_toast: function(typ="text", ctt="🐵", tot=2000) {
            let self = this;
            console.log(['push_toast', typ, ctt, tot]);
            let idx = self.ui.toasts_last_idx+1;
            self.ui.toasts.push({
                'idx': idx,
                'type': typ,
                'content': ctt,
                'show': 1,
            });
            self.ui.toasts_last_idx += 1;
            let that = self;
            setTimeout(()=>{that.remove_toast(idx);}, tot);
        },
        remove_toast: function(idx) {
            let self = this;
            self.ui.toasts.filter(toast => toast.idx==idx)[0].show = 0;
        },
        push_toptip: function(typ="text", ctt="🐵", tot=2000) {
            let self = this;
            console.log(['push_toptip', typ, ctt, tot]);
            let idx = self.ui.toptips_last_idx+1;
            self.ui.toptips.push({
                'idx': idx,
                'type': typ,
                'content': ctt,
                'show': 1,
            });
            self.ui.toptips_last_idx += 1;
            let that = self;
            setTimeout(()=>{that.remove_toptip(idx);}, tot);
        },
        remove_toptip: function(idx) {
            let self = this;
            self.ui.toptips.filter(toptip => toptip.idx==idx)[0].show = 0;
        },
        user_agent: function() {
            return navigator.userAgent;
        },
        readDataFromLocalStorage: function() {
            let self = this;
            // if(window.localStorage){
            //     for (let field of self.fields) {
            //         if (window.localStorage[`${self.app_name}:${field}`] && window.localStorage[`${self.app_name}:${field}`]!="undefined") {
            //             self[field] = JSON.parse(window.localStorage[`${self.app_name}:${field}`]);
            //         };
            //     };
            // };
            for (let field of self.fields) {
                let it = store.get(`${self.app_name}:${field}`);
                if (it) {
                    self[field] = it;
                };
            };
        },
        saveDataToLocalStorage: function() {
            let self = this;
            // if(window.localStorage){
            //     for (let field of self.fields) {
            //         window.localStorage[`${self.app_name}:${field}`] = JSON.stringify(self[field]);
            //     };
            // };
            for (let field of self.fields) {
                store.set(`${self.app_name}:${field}`, self[field]);
            };
        },
    },
    watch: {
        hash: function(val, oldVal) {
            let self = this;
            if (val!="#"&&val[0]=="#") {
                self.go_hash(val.slice(1,val.length));
            };
        },
    },
    beforeCreate() {
        let self = this;
    },
    mounted() {
        let self = this;
        // alert("mounted");
        try {
            // alert("try");
            if (store.enabled) {
                // alert("store.enabled");
                self.store_enabled = true;
                self.readDataFromLocalStorage();
                // alert("readDataFromLocalStorage");
                self.ui.toptips_last_idx = 1;
                self.ui.toptips = [];
                self.ui.toasts_last_idx = 1;
                self.ui.toasts = [];
                // alert("before push_toast");
                // self.push_toast('info', `【测试】`, 10000);
                // alert("after push_toast");
            } else {
                // alert("store.enabled == false");
                self.store_enabled = false;
                self.ui.toptips_last_idx = 1;
                self.ui.toptips = [];
                self.ui.toasts_last_idx = 1;
                self.ui.toasts = [];
                // alert("before push_toast");
                // self.push_toast('info', `【测试】`, 10000);
                self.push_toptip('warn', `您的浏览器不支持存储功能，请关闭隐私模式，或使用更加现代的浏览器！`, 10000);
                // alert("after push_toast");
            };
            self.ready = false;
            // alert("self.ready = false");
            //
            if (self.settings.dark_mode_follow_system) {
                // alert("dark_mode_follow_system");
                document.querySelector('body').removeAttribute('data-weui-theme');
            } else {
                // alert("dark_mode_follow_system false");
                document.querySelector('body').setAttribute('data-weui-theme', self.settings.dark_mode?'dark':'light');
            };
            //
            if( ("onhashchange" in window) && ((typeof document.documentMode==="undefined") || document.documentMode==8)) {
                // alert("onhashchange");
                window.onhashchange = function() {
                    // self.push_toptip('warn', `浏览器能够监听 hash 变化`, 2000);
                    self.hash = location.hash;
                };
                // alert("onhashchange done");
            } else {
                // alert("setInterval");
                setInterval(function() {
                    // self.push_toptip('warn', `启用了定时检查 hash 的任务`, 2000);
                    self.hash = location.hash;
                }, 150);
                // alert("setInterval done");
            };
            //
            //
            self.status.lc_initiated = false;
            self.status.loginning = false;
            if (self.status.logged_in) {
                // alert("应该登录了吧");
                if (self.lean_cloud_keys_str) {
                    self.lean_cloud_keys = {
                        appId: "",
                        appKey: "",
                        serverURL: "",
                    };
                    let ll = self.lean_cloud_keys_str.trim().split(" ");
                    if (ll.length != 3) {
                        self.push_toast('danger', `缓存中的LeanCloud字符串可能不正确`, 2000);
                    } else {
                        try {
                            self.lean_cloud_keys = {
                                appId: ll[0],
                                appKey: ll[1],
                                serverURL: ll[2],
                            };
                        } catch(error) {
                            self.push_toptip('warn', `缓存中的LeanCloud字符串有问题`, 2000);
                        };
                    };
                };
                if (self.lean_cloud_keys.appId&&self.lean_cloud_keys.appKey&&self.lean_cloud_keys.serverURL) {
                    try {
                        LC.init(self.lean_cloud_keys);
                        self.status.lc_initiated = true;
                        // self.push_toptip('success', `LeanCloud已自动初始化`, 2000);
                    } catch(error) {
                        self.push_toptip('warn', `LeanCloud自动初始化出现问题`, 2000);
                    };
                };
            } else {
                // alert("请登录");
                self.push_toptip('info', `请登录`, 500);
                // alert("请登录 done");
            };
            self.status.loginning = false;
            if (self.status.lc_initiated) {
                // alert("lc_initiated");
                self.status.logged_in = LC.User.current() ? true : false;
            };
            if (self.status.logged_in) {
                // alert("logged_in");
                self.push_toast('success', `你好，${self.status.username}，欢迎回来！`, 1000);
                self.sync();
                // alert("sync done");
                if (location.hash=="") {
                    console.log(`self.hash==""`);
                    // alert("go_hash(‘notes’)");
                    self.go_hash("notes");
                    // alert("go_hash(‘notes’) done");
                } else if (location.hash!="#"&&location.hash[0]=="#") {
                    // alert(`go_hash(‘${location.hash.slice(1,location.hash.length)}’)`);
                    self.go_hash(location.hash.slice(1,location.hash.length));
                    // alert(`go_hash(‘${location.hash.slice(1,location.hash.length)}’) done`);
                };
            } else {
                // alert("😄");
                self.go_hash("page-login");
            };
            //
            self.ready = true;
            // alert(`${self.status.current_page},${self.status.current_tab},${location}`);
            // self.push_toast('info', `……`);
        } catch(error) {
            alert(`${error}`);
            self.push_toptip('warn', `${error}`, 5000);
        };
    },
    updated() {
        let self = this;
        if (self.settings.dark_mode_follow_system) {
            document.querySelector('body').removeAttribute('data-weui-theme');
        } else {
            document.querySelector('body').setAttribute('data-weui-theme', self.settings.dark_mode?'dark':'light');
        };
        if (self.status.lc_initiated) {self.status.logged_in = LC.User.current() ? true : false;};
        self.saveDataToLocalStorage();
    },
    beforeDestroy() {
        let self = this;
        // document.querySelector('body').removeAttribute('data-weui-theme');
    },

});

