marked.setOptions({
  highlight: function (code, lang) {
    var validLang = !!(lang && hljs.getLanguage(lang));
    return validLang ? hljs.highlight(lang, code).value : code;
  }
});

var my_fetch = function(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
        cb(xhr.responseText);
    };
    xhr.send();
};

var setTitle = function(title) {
    document.title = title + " | SJ Zhu's Blog";
}

var Home = {
    template: `
        <div>
            <div class="post" v-for="post in posts" :key="post.filename">
                <a v-bind:href="'view/' + post.filename" class="permalink" v-on:click.prevent="go(post.filename)">#</a>
                <h2>{{ post.name }}</h2>
                <div class="info">Date: {{ post.date }}</div>
            </div>
        </div>
    `,
    data: function() {
        return {posts: []};
    },
    mounted: function() {
        setTitle('Home');
        var vm = this;
        var posts_url = "posts.json";
        my_fetch(posts_url, function(res) {
            posts = JSON.parse(res);
            posts.sort(function(post_a, post_b) {
                date_a = new Date(post_a.date);
                date_b = new Date(post_b.date);
                return date_a < date_b;
            });
            vm.posts = posts;
        });
    },
    methods: {
        go: function(filename) {
            var href = 'view/' + filename;
            this.$root.current_path = href;
            window.history.pushState(
                null,
                null,
                href
            );
        }
    }
};

Post = {
    template: `
        <div class="markdown-body post" v-html='postHtml'></div>
    `,
    data: function() {
        return {postHtml: ''};
    },
    props: ['filename'],
    mounted: function() {
        var vm = this;
        my_fetch('posts/'+vm.filename+'.md', function(res) {
            vm.postHtml = marked(res);
            var tmp = document.createElement('html');
            tmp.innerHTML = vm.postHtml;
            var titles = tmp.getElementsByTagName('h1');
            if(titles.length > 0){
                setTitle(titles[0].textContent);
            }
        });
    },
    updated: function() {
        var hash = window.location.hash;
        if(hash.length > 0){
            window.location.href = window.location.href;
        }
    }
};


// base = '/blog/'
var base = document.querySelector('base').getAttribute('href').replace(/\/$/, '');

var app = new Vue({
    el: '#content',
    data: function() {
        return {current_path: window.location.pathname};
    },
    computed:{
        view_component: function() {
            var path = this.current_path.replace(base, '');
            if(!path.startsWith('/')) {
                path = '/' + path;
            }
            var route_re = new RegExp('(/[^/]*).*');
            var route_name = route_re.exec(path)[1];
            return route_name;
        }
    },
    render: function(h) {
        if(this.view_component == '/') {
            return h(Home);
        } else if(this.view_component == '/view') {
            var filename_re = new RegExp('view/([^/]*)');
            var filename = filename_re.exec(this.current_path)[1];
            return h(Post, {
                props: {
                    filename: filename
                }
            });
        } else {
            return h('h2', 'Not Found');
        }
    }

});

window.addEventListener('popstate', function(){
  app.current_path = window.location.pathname
});
// vim:ai:et:sta:ts=4:sts=4:sw=4
