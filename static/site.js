function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
};

marked.setOptions({
    highlight: function (code) {
        return hljs.highlightAuto(code).value;
    }
});

var repo = 'zhsj/zhsj.github.io';
var github_api = 'https://api.github.com';
var post_dir = "post";

var post = function(filename) {
    var core = {
        'ajax' : function(filename, callback) {
            var url = github_api + '/repos/' + repo + '/contents/' + post_dir + '/' + filename;
            $.get(url)
            .done(function(data) {
                callback(marked(b64_to_utf8(data.content)));
            })
            .fail(function() {
                callback('<h1>404</h1>');
            });
        }
    };
    return {
        'show': function(selector) {
            core.ajax(filename, function(data) {
                $(selector).html(data);
            });
        }
    };
}

var onePost = function(filename) {
    post(filename).show('#content');
    $('#sidebar').hide();
}

$(document).ready(function(){

    var url = location.href;
    if(url.match('#!post/(.*)')) {
        filename = url.replace(/\.md.*/,'.md').replace(/^.*#!post\//,'')
        onePost(filename);
    }
    else {
        var url = github_api + '/repos/' + repo + '/contents/' + post_dir;
        // get markdown file list
        $.get(url)
        .done(function(data) {
            var posts = [];
            data.forEach(function(element, index, array) {
                if(element.type == "file" && element.name.endsWith(".md")) {
                    posts.push(element.name);
                }
            });
            posts.forEach(function(element, index, array) {
                var sidebar_dom = $("<li />");
                sidebar_dom.html('<a href="#!post/' + element + '">' + element.replace('.md','') + '</a>');
                $("#sidebar ul").append(sidebar_dom);
            });
            post(posts[0]).show('#content');
            $('#sidebar a').click(function() {
                filename = this.href.replace(/\.md.*/,'.md').replace(/^.*#!post\//,'')
                onePost(filename);
            });

        });
    }
});
