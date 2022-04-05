(function ($) {
    "use strict";

    // Dropdown on mouse hover
    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 768) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });


    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
    });


    // Header slider
    $('.header-slider').slick({
        autoplay: true,
        dots: true,
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1
    });


    // Product Slider 4 Column
    $('.product-slider-4').slick({
        autoplay: true,
        infinite: true,
        dots: false,
        slidesToShow: 4,
        slidesToScroll: 1,
        responsive: [
            {
                breakpoint: 1200,
                settings: {
                    slidesToShow: 4,
                }
            },
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 3,
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                }
            },
            {
                breakpoint: 576,
                settings: {
                    slidesToShow: 1,
                }
            },
        ]
    });


    // Product Slider 3 Column
    $('.product-slider-3').slick({
        autoplay: true,
        infinite: true,
        dots: false,
        slidesToShow: 3,
        slidesToScroll: 1,
        responsive: [
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 3,
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                }
            },
            {
                breakpoint: 576,
                settings: {
                    slidesToShow: 1,
                }
            },
        ]
    });


    // Product Detail Slider
    $('.product-slider-single').slick({
        infinite: true,
        autoplay: true,
        dots: false,
        fade: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        asNavFor: '.product-slider-single-nav'
    });
    $('.product-slider-single-nav').slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        dots: false,
        centerMode: true,
        focusOnSelect: true,
        asNavFor: '.product-slider-single'
    });


    // Brand Slider
    $('.brand-slider').slick({
        speed: 5000,
        autoplay: true,
        autoplaySpeed: 0,
        cssEase: 'linear',
        slidesToShow: 5,
        slidesToScroll: 1,
        infinite: true,
        swipeToSlide: true,
        centerMode: true,
        focusOnSelect: false,
        arrows: false,
        dots: false,
        responsive: [
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 4,
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 3,
                }
            },
            {
                breakpoint: 576,
                settings: {
                    slidesToShow: 2,
                }
            },
            {
                breakpoint: 300,
                settings: {
                    slidesToShow: 1,
                }
            }
        ]
    });


    // Review slider
    $('.review-slider').slick({
        autoplay: true,
        dots: false,
        infinite: true,
        slidesToShow: 2,
        slidesToScroll: 1,
        responsive: [
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1,
                }
            }
        ]
    });


    // Widget slider
    $('.sidebar-slider').slick({
        autoplay: true,
        dots: false,
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1
    });


    // Quantity
    // TODO: Move it to ajax function
    $('.qty button').on('click', function () {
        var $button = $(this);
        var oldValue = $( "#qtyNum" ).val();
        if ($button.hasClass('btn-plus')) {
            console.log("add");
            var newVal = parseFloat(oldValue) + 1;
            if (newVal > parseFloat($( "#qtyNum" ).data( "max" ))) {
                newVal = oldValue
            }
        } else {
            if (oldValue > 1) {
                var newVal = parseFloat(oldValue) - 1;
            } else {
                var newVal = 1;
            }
        }
        $button.parent().find('input').val(newVal);
    });


    // Shipping address show hide
    $('.checkout #shipto').change(function () {
        if ($(this).is(':checked')) {
            $('.checkout .shipping-address').slideDown();
        } else {
            $('.checkout .shipping-address').slideUp();
        }
    });


    // Payment methods show hide
    $('.checkout .payment-method .custom-control-input').change(function () {
        if ($(this).prop('checked')) {
            var checkbox_id = $(this).attr('id');
            $('.checkout .payment-method .payment-content').slideUp();
            $('#' + checkbox_id + '-show').slideDown();
        }
    });
})(jQuery);

// Login POST - NOT USED
function sendUserPass() {
    let x = document.forms['login-reg-form'];
    $.ajax({
        type: "POST",
        url: "/login/",
        data: { 'csrfmiddlewaretoken': x['csrfmiddlewaretoken'].value, 'username': x['username'].value, 'password': x['password'].value },
        success: function (obj) {
            try {
                const js = JSON.parse(JSON.stringify(obj));
                if('error' in js) {
                    // Wrong password
                    document.getElementById('wrong-pass').innerHTML = "Wrong password or username!";
                }   
            } catch(e) {
                // HTML
                $('html').html(obj);
            }
        }
    });
}

function addCategory(index) {
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set("cat", index);
    window.location.search = searchParams.toString();
}

function addMinMax(min, max) {
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set("minval", min);
    searchParams.set("maxval", max);
    window.location.search = searchParams.toString();
}

function addSearch(ele) {
    if(event.key === 'Enter') {
        var searchParams = new URLSearchParams(window.location.search);
        searchParams.set("search", $( "#searchProduct" ).val());
        window.location.search = searchParams.toString();
    }
}

function addSearchA(ele) {
    if(event.key === 'Enter') {
        var product_page = window.location.origin + '/products/?'

        var searchParams = new URLSearchParams(window.location.search);
        searchParams.set("search", $( "#searchProductGlobal" ).val());
        window.location.replace(product_page + searchParams.toString());
    }
}

function addSearchC(ele) {
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set("search", $( "#searchProduct" ).val());
    window.location.search = searchParams.toString();
}

function addSortByParams(ele, text) {
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set("sort", text);
    window.location.search = searchParams.toString();
}

function changeMin() {
    $( "#slider-range" ).slider( "values", 0, $( "#amount1" ).val());
    addMinMax($( "#amount1" ).val(), $( "#amount2" ).val());
}

function changeMax() {
    $( "#slider-range" ).slider( "values", 1, $( "#amount2" ).val());
    addMinMax($( "#amount1" ).val(), $( "#amount2" ).val());
}

function clearFilters() {
    window.location.search = '';
}

function clearFilter(filter) {
    var filterToClear;

    switch(filter) {
        case "Category":
            filterToClear = "cat";
            break;
        case "Min Price":
            filterToClear = "minval";
            break;
        case "Max Price":
            filterToClear = "maxval";
            break;
        case "Search":
            filterToClear = "search";
            break;
    }
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.delete(filterToClear);
    window.location.search = searchParams.toString();
}

function moveToPage(page) {
    if(hasPage()) {
        replacePage(page);
    } else {
        window.location.pathname += "/" + page;
    }
}

function hasPage() {
    return new RegExp("/[0-9]+").test(window.location.pathname);
}

function replacePage(page) {
    window.location.pathname = window.location.pathname.replace(new RegExp("/[0-9]+"), "/" + page);
}

function checkRegisterForm() {
    var pass = $( "#password1" ).val();
    var pass2 = $( "#password2" ).val();

    if(pass != pass2) {
        $( "#errorMsg" ).html("Passwords don't match!");
        return false;
    }

    $.post( "/register", {
        username: $( "#username" ).val(),
        email: $( "#email" ).val(),
        password1: pass,
        first: $( "#first" ).val(),
        last: $( "#last" ).val(),
        address: $( "#address" ).val(),
        country: $( "#country" ).val()
    }, function( data ) {
        if(data.ok)
            window.location.replace("/");
        else 
            $( "#errorMsg" ).html(data.message);
    });

    return false;
}

function buyProduct(id, qty, variation = '') {
    if(variation == '') {
        $( "#addCartBtn" ).attr("href", "/addToCart/?id=" + id + "&quantity=" + qty);
    } else {
        $( "#addCartBtn" ).attr("href", "/addToCart/?id=" + id + "&quantity=" + qty + "&var=" + variation);
    }

    return true
}

function addToCart(id, qty, isCart) {
    $.ajax({
        url: "/addToCart",
        data: { 'id': id, 'quantity': qty, 'cart': isCart },
        success: function (obj) {
            // alert(obj);
        },
        error: function (obj) {
            // alert(JSON.stringify(obj));
        }
    });
}

function removeFromCart(id, qty) {
    $.ajax({
        url: "/removeFromCart",
        data: { 'id': id, 'quantity': qty },
        success: function (obj) { }
    });
}

function validateAddToCartBtn(id, qtyId) {
    const filters = document.getElementsByClassName("filters")[0]

    const qty = document.getElementById(qtyId).value;

    if (filters == undefined) {
        return buyProduct(id, qty)
    }

    for (var c = 0; c < filters.children.length; c++) {
        var filter = filters.children[c]
        var tag = filter.querySelectorAll("h4")[0].innerHTML
        var ele = filter.querySelectorAll(".btn-group > input.btn-check:checked")
        
        if(ele.length == 0) {
            document.getElementById("detail-error").innerHTML = "Filter " + tag + " has no selected attribute!"
            return false
        } else if(ele.length > 1) {
            document.getElementById("detail-error").innerHTML = "Filter " + tag + " has more than one selected attribute! Try to refresh the page?"
            return false
        }

        selected_tag = ele[0].name
    }

    return buyProduct(id, qty, ele[0].dataset.var)
}

function showPaymentModal() {
    $('#paymentModal').modal('show')
    setTimeout(function () {
        location.href = '/'
    }, 3000);
}

function showHiddenAlert(alert, img, msg) {
    $('#hidden-alert').addClass("alert");
    $('#hidden-alert').addClass(alert);
    $('#hidden-alert').addClass("show");
    $('#hidden-alert-icon').addClass(img);
    $('#hidden-alert-msg').html(msg);

    $('#hidden-alert').removeAttr('style');

    $('#hidden-alert').show();
}