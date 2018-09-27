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
};

var setContent = function(content) {
    document.getElementById("content").innerHTML = content;
};

var render_home = function() {
    var posts_url = "posts.json";
    my_fetch(posts_url, function(res) {
        posts = JSON.parse(res);
        posts.sort(function(post_a, post_b) {
            date_a = new Date(post_a.date);
            date_b = new Date(post_b.date);
            return date_a < date_b;
        });
        var content = '';
        posts.forEach(function(post) {
            content += '\n' +
                '<div class="post">' +
                '    <a href="view/' + post.filename + '" class="permalink">#</a>' +
                '    <h2>' + post.name + '</h2>' +
                '    <div class="info">Date: ' + post.date + '</div>' +
                '</div>'
        });
        setContent(content);
    });
};

var render_post = function(filename) {
    my_fetch('posts/'+filename+'.md', function(res) {
        var postHtml = marked(res);
        var content = document.createElement('div');
        content.classList.add('markdown-body', 'post');
        content.innerHTML = postHtml;
        var titles = content.getElementsByTagName('h1');
        if(titles.length > 0){
            setTitle(titles[0].textContent);
        }
        document.getElementById('content').appendChild(content);
        var hash = window.location.hash;
        if(hash.length > 0){
            window.location.href = window.location.href;
        }
    });
};

var render_404 = function() {
    content = '<h2>Not Found!</h2>';
    setTitle('404');
    setContent(content);
};

// base = '/blog/'
var base = document.querySelector('base').getAttribute('href').replace(/\/$/, '');

var path = window.location.pathname.replace(base, '');
if(!path.startsWith('/')) {
    path = '/' + path;
}

var filename_re = new RegExp('/view/([^/]*)');
if (path === '/') {
    render_home();
} else if(path.startsWith('/view/')) {
    var filename = filename_re.exec(path)[1];
    render_post(filename.replace(/\.html$/, ''));
} else {
    render_404();
}

// vim:ai:et:sta:ts=4:sts=4:sw=4
