var the_vue = new Vue({
    el: '#app',
    data: {
        "app_name": "MyNote",
        "fields": ["lean_cloud_keys", "user", "settings", "tabs", "ui"],
        //
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
            ready: false,
        },
        "settings": {
            remember_user: true,
            dark_mode: false,
        },
        //
        "pages": ["login", "main", "welcome", "settings"],
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
                name: "me",
                icon: "user",
                idx: 1,
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
        //
    },
    computed: {
        dark_mode: function() {
            let self = this;
            return self.settings.dark_mode;
        },
    },


    methods: {

        go_tab: function(x) {
            let self = this;
            self.tabs.forEach(pp => {
                pp.active = pp.idx == x;
            });
            self.ui.tab_current = x;
            location.hash=`#${self.tabs[x].name}`;
        },

        login: function() {
            let self = this;
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
                self.push_toast('success', `你好，${LC.User.current().data.username}，登录成功啦！`, 1000);
                // self.status.logged_in = true;
                self.user.password = '';
                self.user.username = self.settings.remember_user ? self.user.username : '';
                self.status.current_page = 1;
                // self.refresh();
            }).catch(({ error }) => self.push_toptip('danger', error, 3000));
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
    // watch: {
    //     dark_mode: function() {
    //         document.querySelector('body').setAttribute('data-weui-theme', self.dark_mode?'dark':'light');
    //     },
    // },
    beforeCreate() {
        let self = this;
    },
    created() {
        let self = this;
        self.readDataFromLocalStorage();
        if (self.lean_cloud_keys.appId) {
            try {
                LC.init(self.lean_cloud_keys);
                self.status.lc_initiated = true;
                // self.push_toptip('success', `LeanCloud已自动初始化`, 2000);
            } catch(error) {
                // self.push_toptip('warn', `LeanCloud自动初始化出现问题`, 2000);
            };
        };
        if (self.status.lc_initiated) {self.status.logged_in = LC.User.current() ? true : false;};
        if (self.status.logged_in) {
            self.push_toast('success', `你好，${LC.User.current().data.username}，欢迎回来！`, 1000);
            self.status.current_page = 1;
        };
        document.querySelector('body').setAttribute('data-weui-theme', self.settings.dark_mode?'dark':'light');
        self.status.ready = true;
    },
    updated() {
        let self = this;
        document.querySelector('body').setAttribute('data-weui-theme', self.dark_mode?'dark':'light');
        if (self.status.lc_initiated) {self.status.logged_in = LC.User.current() ? true : false;};
        self.saveDataToLocalStorage();
    },
    beforeDestroy() {
        let self = this;
        // document.querySelector('body').removeAttribute('data-weui-theme');
    },

});

