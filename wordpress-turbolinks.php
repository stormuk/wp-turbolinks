<?php

/*
Plugin Name: WordPress Turbolinks
Description: Implement the Turbolinks feature of Rails 4.0 for WordPress
Author: Adam Pope
Author URI: http://www.stormconsultancy.co.uk

This is an experimental port of @dhh's Turbolinks gem for Rails

*/

function enqueue_turbolinks() {
  if(!is_admin()) {

    //var_dump(plugin_dir_url(__FILE__));

    $dir = content_url() . '/plugins/' . basename(dirname(__FILE__)) .'/';

    wp_register_script('turbolinks', $dir . 'assets/turbolinks.js');
    wp_enqueue_script('turbolinks');

    wp_register_script('turbolinks-jquery', $dir . 'assets/jquery.turbolinks.js', array('jquery', 'turbolinks'));
    wp_enqueue_script('turbolinks-jquery');
  }
}

add_action('wp_enqueue_scripts', 'enqueue_turbolinks'); 


function add_xhr_location(){
  header("X-XHR-Current-Location: ". selfURL());
}

add_action('template_redirect', 'add_xhr_location');


//http://stackoverflow.com/questions/2236873/getting-the-full-url-of-the-current-page-php
function selfURL() 
{ 
    $s = empty($_SERVER["HTTPS"]) ? '' : ($_SERVER["HTTPS"] == "on") ? "s" : ""; 
    $protocol = "http".$s; 
    $port = ($_SERVER["SERVER_PORT"] == "80") ? "" : (":".$_SERVER["SERVER_PORT"]); 
    return $protocol."://".$_SERVER['SERVER_NAME'].$port.$_SERVER['REQUEST_URI']; 
}

?>
