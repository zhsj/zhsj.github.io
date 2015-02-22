// Test
function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
};

marked.setOptions({
    highlight: function (code) {
        return hljs.highlightAuto(code).value;
    }
});

var github_content = "https://api.github.com/repos/zhsj/zhsj.github.io/contents";

var temp;
var post_dir = "post";
var posts = [];
var posts_number = 0;
var posts_content = {};

$(document).ready(function(){
    // get markdown file list
    $.get(github_content + '/' + post_dir, function(data) {

        temp = data;
        posts_number = data.length;
        var posts_count = 0;
        data.forEach(function(element, index, array) {
            if(element.type == "file" && element.name.endsWith(".md")) {

                posts.push(element.name);
                var element_url = element.url;
                $.get(element_url, function(data) {
                    var markdown_content = b64_to_utf8(data.content);
                    var html_content = marked(markdown_content);

                    posts_content[element.name] = html_content;
                    posts_count += 1;

                    if(posts_count == posts_number) {
                        // Todo
                        posts.forEach(function(element, index, array) {
                            var content_dom = $("<div class='post'/>");
                            content_dom.html(posts_content[element]);
                            $("#content").append(content_dom);
                            var sidebar_dom = $("<li />");
                            var content_h1 = content_dom.find("h1");
                            sidebar_dom.html('<a href="#' + content_h1.attr('id') + '">' + content_h1.html() + '</a>');
                            $("#sidebar ul").append(sidebar_dom);
                        });
                    }


                });

            }
        });
    });


});
