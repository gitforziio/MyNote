var the_vue = new Vue({
    el: '#app',
    data: {
        "app_name": "MyNote",
        "fields": ["lean_cloud_keys", "user", "settings", "status", "ui"],
        //
        "hash": "",
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
        //
        "status": {
            lc_initiated: false,
            logged_in: false,
            current_page: 0,
            current_tab: 0,
            loginning: false,
        },
        "ready": false,
        "settings": {
            remember_user: true,
            dark_mode: false,
            dark_mode_follow_system: true,
        },
        //
        "pages": ["login", "main", "welcome", "settings", "add_post_gzh"],
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
            console.log(`go to: ${hash}`);
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
            };
            if (hash in _map) {
                _map[hash]();
            } else {
                self.go_hash(`notes`);
            };
        },

        login: function() {
            let self = this;
            self.status.loginning = true;
            if (!self.status.lc_initiated) {
                try {
                    LC.init(self.lean_cloud_keys);
                    self.status.lc_initiated = true;
                } catch(error) {
                    self.push_toast('success', `LeanCloud已初始化`, 2000);
                };
            }
            LC.User.login(self.user.username, self.user.password)
            .then((x) => {
                self.status.loginning = false;
                self.push_toast('success', `你好，${LC.User.current().data.username}，登录成功啦！`, 1000);
                // self.status.logged_in = true;
                self.user.password = '';
                self.user.username = self.settings.remember_user ? self.user.username : '';
                self.status.current_page = 1;
                // self.refresh();
            }).catch(({ error }) => {
                self.status.loginning = false;
                self.push_toptip('danger', error, 3000);
                self.user.password = '';
                self.user.username = self.settings.remember_user ? self.user.username : '';
            });
        },

        logOut: function() {
            let self = this;
            self.push_toast('text', `再见${LC.User.current().data.username}！`);
            LC.User.logOut();
            self.user.password = "";
            self.status.current_page = 0;
            // self.status.logged_in = false;
            // self.refresh();
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
            for (let field of self.fields) {
                if (window.localStorage[`${self.app_name}:${field}`] && window.localStorage[`${self.app_name}:${field}`]!="undefined") {
                    self[field] = JSON.parse(window.localStorage[`${self.app_name}:${field}`]);
                };
            };
        },
        saveDataToLocalStorage: function() {
            let self = this;
            if(window.localStorage){
                for (let field of self.fields) {
                    window.localStorage[`${self.app_name}:${field}`] = JSON.stringify(self[field]);
                };
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
    created() {
        let self = this;
        self.readDataFromLocalStorage();
        if (self.lean_cloud_keys.appId&&self.lean_cloud_keys.appKey&&self.lean_cloud_keys.serverURL) {
            try {
                LC.init(self.lean_cloud_keys);
                self.status.lc_initiated = true;
                // self.push_toptip('success', `LeanCloud已自动初始化`, 2000);
            } catch(error) {
                self.push_toptip('warn', `LeanCloud自动初始化出现问题`, 2000);
            };
        };
        if (self.status.loginning) {
            self.status.loginning = false;
        };
        if (self.status.lc_initiated) {self.status.logged_in = LC.User.current() ? true : false;};
        if( ("onhashchange" in window) && ((typeof document.documentMode==="undefined") || document.documentMode==8)) {
            window.onhashchange = function() {
                // self.push_toptip('warn', `浏览器能够监听 hash 变化`, 2000);
                self.hash = location.hash;
            };
        } else {
            setInterval(function() {
                // self.push_toptip('warn', `启用了定时检查 hash 的任务`, 2000);
                self.hash = location.hash;
            }, 150);
        };
        if (self.status.logged_in) {
            self.push_toast('success', `你好，${LC.User.current().data.username}，欢迎回来！`, 1000);
            // self.status.current_page = 1;
            if (self.hash=="") {
                self.go_hash("notes");
            } else if (self.hash!="#"&&self.hash[0]=="#") {
                self.go_hash(self.hash.slice(1,self.hash.length));
            };
        };
        if (self.settings.dark_mode_follow_system) {
            document.querySelector('body').removeAttribute('data-weui-theme');
        } else {
            document.querySelector('body').setAttribute('data-weui-theme', self.settings.dark_mode?'dark':'light');
        };
        self.ready = true;
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

