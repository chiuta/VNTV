<?php
/**
 * Plugin Name:       VideoNeat Index
 * Description:       Publishes a compact, cacheable JSON catalog of VideoNeat titles (trailer, year, length, source) for VNTV, the Stremio addon and other trade-free clients. No tracking, no external services except the site's own PeerTube instance.
 * Version:           1.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Alexio (TROM volunteer)
 * License:           MIT
 * Text Domain:       videoneat-index
 *
 * Endpoints:
 *   GET /wp-json/videoneat/v1/index        the full catalog (JSON, 12 h cache, ETag, open CORS)
 *   GET /wp-json/videoneat/v1/item/<id>    one title with its full description
 *   GET /wp-json/videoneat/v1/stats        coverage: how many titles have a PeerTube / YouTube / no trailer
 *   Static file: /wp-content/uploads/videoneat-index.json (regenerated automatically)
 * WP-CLI:
 *   wp videoneat-index rebuild [--no-peertube]   ·   wp videoneat-index stats
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'VNI_VERSION', '1.1.0' );
define( 'VNI_META', '_vni_data' );
define( 'VNI_CACHE', 'vni_index_v1' );
define( 'VNI_OPT', 'vni_settings' );
define( 'VNI_BATCH', 10 );        // small batches: each one also has a 20-second time budget
define( 'VNI_BUDGET', 20 );

require_once __DIR__ . '/includes/parser.php';

/* ------------------------------------------------------------------ settings */
function vni_settings() {
	$s = get_option( VNI_OPT, array() );
	return wp_parse_args( $s, array(
		'hosts'       => 'videos.trom.tf',
		'peertube'    => 1,    // read the trailer's duration and preview image from the PeerTube API
		'static_file' => 1,    // also write /wp-content/uploads/videoneat-index.json
	) );
}
function vni_hosts() {
	$h = array_filter( array_map( 'trim', explode( ',', strtolower( vni_settings()['hosts'] ) ) ) );
	return $h ? array_values( $h ) : array( 'videos.trom.tf' );
}

/* ------------------------------------------------- indexing one post */
function vni_post_html( $post ) {
	$parts = array();
	if ( class_exists( '\Elementor\Plugin' ) && get_post_meta( $post->ID, '_elementor_edit_mode', true ) ) {
		try {
			$parts[] = \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $post->ID, false );
		} catch ( \Throwable $e ) { // fall back to the other sources
		}
		$raw = get_post_meta( $post->ID, '_elementor_data', true );
		if ( is_string( $raw ) && '' !== $raw ) {
			$parts[] = $raw;
		}
	}
	$parts[] = $post->post_content;
	return implode( "\n", array_filter( $parts ) );
}

function vni_index_post( $post_id, $peertube = null ) {
	$post = get_post( $post_id );
	if ( ! $post || 'post' !== $post->post_type ) {
		return null;
	}
	if ( 'publish' !== $post->post_status ) {
		delete_post_meta( $post_id, VNI_META );
		return null;
	}
	$d = vni_extract( vni_post_html( $post ), vni_hosts() );
	if ( null === $peertube ) {
		$peertube = (bool) vni_settings()['peertube'];
	}
	if ( $d['trailer'] && $peertube ) {
		$r = wp_remote_get( sprintf( 'https://%s/api/v1/videos/%s', $d['trailer']['host'], rawurlencode( $d['trailer']['id'] ) ), array( 'timeout' => 5 ) );
		if ( ! is_wp_error( $r ) && 200 === wp_remote_retrieve_response_code( $r ) ) {
			$v = json_decode( wp_remote_retrieve_body( $r ), true );
			if ( is_array( $v ) ) {
				$d['trailer']['dur'] = isset( $v['duration'] ) ? (int) $v['duration'] : null;
				if ( ! empty( $v['previewPath'] ) ) {
					$d['trailer']['preview'] = 'https://' . $d['trailer']['host'] . $v['previewPath'];
				}
			}
		}
	}
	$d['indexed'] = time();
	update_post_meta( $post_id, VNI_META, $d );
	return $d;
}

function vni_item( $post_id, $d ) {
	// excerpt: the author's own, or the start of the extracted description (avoids expensive content rendering)
	$p       = get_post( $post_id );
	$excerpt = ( $p && '' !== trim( $p->post_excerpt ) ) ? $p->post_excerpt : ( $d['desc'] ?? '' );
	return array(
		'id'         => (int) $post_id,
		'title'      => html_entity_decode( get_the_title( $post_id ), ENT_QUOTES, 'UTF-8' ),
		'link'       => get_permalink( $post_id ),
		'date'       => get_the_date( 'Y-m-d', $post_id ),
		'cats'       => array_map( 'intval', wp_get_post_categories( $post_id ) ),
		'img'        => get_the_post_thumbnail_url( $post_id, 'medium_large' ) ?: null,
		'trailer'    => $d['trailer'] ?? null,
		'year'       => $d['year'] ?? null,
		'length'     => $d['length'] ?? null,
		'source'     => $d['source'] ?? null,
		'source_url' => $d['source_url'] ?? null,
		'excerpt'    => html_entity_decode( wp_trim_words( wp_strip_all_tags( $excerpt ), 45, '…' ), ENT_QUOTES, 'UTF-8' ),
	);
}

/* ------------------------------------------------------- building the catalog */
function vni_build_index() {
	$items = array();
	$page  = 1;
	do {
		$ids = get_posts( array(
			'post_type'        => 'post',
			'post_status'      => 'publish',
			'fields'           => 'ids',
			'posts_per_page'   => 300,
			'paged'            => $page,
			'orderby'          => 'date',
			'order'            => 'DESC',
			'suppress_filters' => true,
			'no_found_rows'    => true,
		) );
		foreach ( $ids as $id ) {
			$d = get_post_meta( $id, VNI_META, true );
			if ( ! is_array( $d ) ) {
				continue; // not indexed yet (the full reindex will pick it up)
			}
			$items[] = vni_item( $id, $d );
		}
		$page++;
	} while ( count( $ids ) === 300 );

	$data = array(
		'v'         => 1,
		'generated' => gmdate( 'c' ),
		'site'      => home_url( '/' ),
		'count'     => count( $items ),
		'items'     => $items,
	);
	set_transient( VNI_CACHE, $data, 12 * HOUR_IN_SECONDS );
	if ( vni_settings()['static_file'] ) {
		vni_write_static( $data );
	}
	return $data;
}
function vni_get_index() {
	$d = get_transient( VNI_CACHE );
	return is_array( $d ) ? $d : vni_build_index();
}
function vni_write_static( $data ) {
	$up = wp_upload_dir();
	if ( ! empty( $up['error'] ) ) {
		return;
	}
	$file = trailingslashit( $up['basedir'] ) . 'videoneat-index.json';
	$tmp  = $file . '.tmp';
	if ( false !== file_put_contents( $tmp, wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ) ) {
		rename( $tmp, $file );
	}
}
function vni_invalidate() {
	delete_transient( VNI_CACHE );
	if ( ! wp_next_scheduled( 'vni_rebuild_file' ) ) {
		wp_schedule_single_event( time() + 60, 'vni_rebuild_file' );
	}
}
add_action( 'vni_rebuild_file', 'vni_build_index' );

/* --------------------------------------- automatic update on publish */
add_action( 'save_post_post', function ( $post_id, $post ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	vni_index_post( $post_id );
	vni_invalidate();
}, 20, 2 );
add_action( 'elementor/editor/after_save', function ( $post_id ) {
	vni_index_post( $post_id );
	vni_invalidate();
} );
add_action( 'deleted_post', 'vni_invalidate' );
add_action( 'trashed_post', 'vni_invalidate' );

/* --------------------------------------- full reindex, in batches (WP-Cron) */
function vni_start_rebuild() {
	update_option( 'vni_progress', array( 'offset' => 0, 'done' => 0, 'running' => 1, 'started' => time() ), false );
	wp_schedule_single_event( time(), 'vni_rebuild_batch' );
}
add_action( 'vni_rebuild_batch', function () {
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 60 );
	}
	$t0  = microtime( true );
	$p   = get_option( 'vni_progress', array() );
	$ids = get_posts( array(
		'post_type' => 'post', 'post_status' => 'publish', 'fields' => 'ids', 'orderby' => 'ID', 'order' => 'ASC',
		'posts_per_page' => VNI_BATCH, 'offset' => (int) ( $p['offset'] ?? 0 ), 'suppress_filters' => true,
	) );
	$n = 0;
	foreach ( $ids as $id ) {
		vni_index_post( $id );
		$n++;
		if ( microtime( true ) - $t0 > VNI_BUDGET ) {
			break; // stay well under PHP's max_execution_time; the next batch continues from here
		}
	}
	$p['offset'] = (int) ( $p['offset'] ?? 0 ) + $n;
	$p['done']   = $p['offset'];
	if ( count( $ids ) === VNI_BATCH || $n < count( $ids ) ) {
		update_option( 'vni_progress', $p, false );
		wp_schedule_single_event( time() + 2, 'vni_rebuild_batch' );
	} else {
		$p['running']  = 0;
		$p['finished'] = time();
		update_option( 'vni_progress', $p, false );
		delete_transient( VNI_CACHE );
		vni_build_index();
	}
} );
register_activation_hook( __FILE__, 'vni_start_rebuild' );
register_deactivation_hook( __FILE__, function () {
	wp_clear_scheduled_hook( 'vni_rebuild_batch' );
	wp_clear_scheduled_hook( 'vni_rebuild_file' );
} );

/* ---------------------------------------------------------------- statistics */
function vni_stats() {
	global $wpdb;
	$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='post' AND post_status='publish'" );
	$rows  = $wpdb->get_col( $wpdb->prepare( "SELECT pm.meta_value FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID=pm.post_id WHERE pm.meta_key=%s AND p.post_status='publish' AND p.post_type='post'", VNI_META ) );
	$s     = array( 'total' => $total, 'indexed' => 0, 'peertube' => 0, 'youtube_only' => 0, 'no_trailer' => 0, 'with_duration' => 0, 'with_year' => 0, 'with_source' => 0 );
	foreach ( $rows as $r ) {
		$d = maybe_unserialize( $r );
		if ( ! is_array( $d ) ) {
			continue;
		}
		$s['indexed']++;
		if ( ! empty( $d['trailer'] ) ) {
			$s['peertube']++;
			if ( ! empty( $d['trailer']['dur'] ) ) {
				$s['with_duration']++;
			}
		} elseif ( ! empty( $d['youtube'] ) ) {
			$s['youtube_only']++;
		} else {
			$s['no_trailer']++;
		}
		if ( ! empty( $d['year'] ) ) {
			$s['with_year']++;
		}
		if ( ! empty( $d['source'] ) ) {
			$s['with_source']++;
		}
	}
	return $s;
}

/* ---------------------------------------------------------------- REST */
add_action( 'rest_api_init', function () {
	register_rest_route( 'videoneat/v1', '/index', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $req ) {
			$data = vni_get_index();
			$etag = '"' . md5( $data['generated'] . $data['count'] ) . '"';
			if ( trim( (string) $req->get_header( 'if_none_match' ) ) === $etag ) {
				$res = new WP_REST_Response( null, 304 );
			} else {
				$res = new WP_REST_Response( $data, 200 );
			}
			$res->header( 'ETag', $etag );
			$res->header( 'Cache-Control', 'public, max-age=900, stale-while-revalidate=86400' );
			return $res;
		},
	) );
	register_rest_route( 'videoneat/v1', '/item/(?P<id>\d+)', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'args'                => array( 'id' => array( 'validate_callback' => 'is_numeric' ) ),
		'callback'            => function ( WP_REST_Request $req ) {
			$id = (int) $req['id'];
			$p  = get_post( $id );
			if ( ! $p || 'publish' !== $p->post_status || 'post' !== $p->post_type ) {
				return new WP_Error( 'not_found', 'Not found', array( 'status' => 404 ) );
			}
			$d = get_post_meta( $id, VNI_META, true );
			if ( ! is_array( $d ) ) {
				$d = vni_index_post( $id, false );
			}
			$res = new WP_REST_Response( array_merge( vni_item( $id, $d ), array( 'desc' => $d['desc'] ?? '' ) ), 200 );
			$res->header( 'Cache-Control', 'public, max-age=3600' );
			return $res;
		},
	) );
	register_rest_route( 'videoneat/v1', '/stats', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			return new WP_REST_Response( vni_stats(), 200 );
		},
	) );
} );
// open CORS for this plugin's routes (public data, no cookies)
add_filter( 'rest_post_dispatch', function ( $res, $server, $req ) {
	if ( 0 === strpos( $req->get_route(), '/videoneat/v1' ) && $res instanceof WP_REST_Response ) {
		$res->header( 'Access-Control-Allow-Origin', '*' );
		$res->header( 'Access-Control-Expose-Headers', 'ETag' );
	}
	return $res;
}, 10, 3 );

/* ---------------------------------------------------------------- admin */
add_action( 'init', function () {
	load_plugin_textdomain( 'videoneat-index', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
} );
add_action( 'admin_menu', function () {
	add_management_page( 'VideoNeat Index', 'VideoNeat Index', 'manage_options', 'videoneat-index', 'vni_admin_page' );
} );
add_action( 'admin_post_vni_rebuild', function () {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Forbidden', 403 );
	}
	check_admin_referer( 'vni_rebuild' );
	vni_start_rebuild();
	wp_safe_redirect( admin_url( 'tools.php?page=videoneat-index&started=1' ) );
	exit;
} );
add_action( 'admin_post_vni_save', function () {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Forbidden', 403 );
	}
	check_admin_referer( 'vni_save' );
	update_option( VNI_OPT, array(
		'hosts'       => sanitize_text_field( wp_unslash( $_POST['hosts'] ?? 'videos.trom.tf' ) ),
		'peertube'    => empty( $_POST['peertube'] ) ? 0 : 1,
		'static_file' => empty( $_POST['static_file'] ) ? 0 : 1,
	) );
	wp_safe_redirect( admin_url( 'tools.php?page=videoneat-index&saved=1' ) );
	exit;
} );
function vni_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s   = vni_stats();
	$p   = get_option( 'vni_progress', array() );
	$set = vni_settings();
	$pct = function ( $n ) use ( $s ) {
		return $s['total'] ? round( 100 * $n / $s['total'] ) . '%' : '—';
	};
	$idx = get_transient( VNI_CACHE );
	echo '<div class="wrap"><h1>VideoNeat Index</h1>';
	echo '<p>' . esc_html__( 'JSON catalog for VNTV, the Stremio addon and other trade-free clients:', 'videoneat-index' ) . ' <code>' . esc_html( rest_url( 'videoneat/v1/index' ) ) . '</code></p>';
	if ( ! empty( $p['running'] ) ) {
		echo '<div class="notice notice-info"><p>' . esc_html( sprintf( __( 'Reindexing: %1$d / %2$d posts. Reload the page to see progress.', 'videoneat-index' ), (int) $p['done'], (int) $s['total'] ) ) . '</p></div>';
	}
	echo '<h2>' . esc_html__( 'Coverage', 'videoneat-index' ) . '</h2><table class="widefat striped" style="max-width:640px"><tbody>';
	$rows = array(
		__( 'Published posts', 'videoneat-index' ) => $s['total'],
		__( 'Indexed', 'videoneat-index' ) => $s['indexed'] . ' (' . $pct( $s['indexed'] ) . ')',
		__( 'With a PeerTube trailer (playable in VNTV)', 'videoneat-index' ) => '<b>' . $s['peertube'] . ' (' . $pct( $s['peertube'] ) . ')</b>',
		__( 'YouTube trailer only (not playable)', 'videoneat-index' ) => $s['youtube_only'] . ' (' . $pct( $s['youtube_only'] ) . ')',
		__( 'No trailer', 'videoneat-index' ) => $s['no_trailer'] . ' (' . $pct( $s['no_trailer'] ) . ')',
		__( 'With trailer duration', 'videoneat-index' ) => $s['with_duration'],
		__( 'With year / with source', 'videoneat-index' ) => $s['with_year'] . ' / ' . $s['with_source'],
		__( 'Catalog generated', 'videoneat-index' ) => $idx ? esc_html( $idx['generated'] ) . ' (' . (int) $idx['count'] . ' ' . __( 'titles', 'videoneat-index' ) . ')' : __( 'not yet', 'videoneat-index' ),
	);
	foreach ( $rows as $k => $v ) {
		echo '<tr><th style="width:55%">' . esc_html( $k ) . '</th><td>' . wp_kses( (string) $v, array( 'b' => array() ) ) . '</td></tr>';
	}
	echo '</tbody></table>';
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="margin:16px 0">';
	wp_nonce_field( 'vni_rebuild' );
	echo '<input type="hidden" name="action" value="vni_rebuild">';
	submit_button( __( 'Reindex all posts', 'videoneat-index' ), 'primary', 'submit', false );
	echo ' <span class="description">' . esc_html( sprintf( __( 'Runs in the background, %d posts at a time.', 'videoneat-index' ), (int) VNI_BATCH ) ) . '</span></form>';

	// posts without a PeerTube trailer, so editors can fix them
	global $wpdb;
	$missing = $wpdb->get_results( $wpdb->prepare(
		"SELECT p.ID, p.post_title FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} pm ON pm.post_id=p.ID AND pm.meta_key=%s
		 WHERE p.post_type='post' AND p.post_status='publish' AND pm.meta_value NOT LIKE %s ORDER BY p.post_date DESC LIMIT 50",
		VNI_META, '%' . $wpdb->esc_like( 's:4:"host"' ) . '%'
	) );
	if ( $missing ) {
		echo '<h2>' . esc_html__( 'Newest posts without a PeerTube trailer', 'videoneat-index' ) . '</h2><ol>';
		foreach ( $missing as $m ) {
			echo '<li><a href="' . esc_url( get_edit_post_link( $m->ID ) ) . '">' . esc_html( $m->post_title ) . '</a></li>';
		}
		echo '</ol>';
	}

	echo '<h2>' . esc_html__( 'Settings', 'videoneat-index' ) . '</h2><form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'vni_save' );
	echo '<input type="hidden" name="action" value="vni_save"><table class="form-table"><tbody>';
	echo '<tr><th>' . esc_html__( 'Accepted PeerTube instances', 'videoneat-index' ) . '</th><td><input type="text" class="regular-text" name="hosts" value="' . esc_attr( $set['hosts'] ) . '"><p class="description">' . esc_html__( 'Comma-separated.', 'videoneat-index' ) . '</p></td></tr>';
	echo '<tr><th>' . esc_html__( 'Duration and image from PeerTube', 'videoneat-index' ) . '</th><td><label><input type="checkbox" name="peertube" value="1" ' . checked( $set['peertube'], 1, false ) . '> ' . esc_html__( 'read them from the PeerTube API (needed for the synchronized broadcast)', 'videoneat-index' ) . '</label></td></tr>';
	echo '<tr><th>' . esc_html__( 'Static file', 'videoneat-index' ) . '</th><td><label><input type="checkbox" name="static_file" value="1" ' . checked( $set['static_file'], 1, false ) . '> ' . esc_html__( 'also write', 'videoneat-index' ) . ' <code>/wp-content/uploads/videoneat-index.json</code></label></td></tr>';
	echo '</tbody></table>';
	submit_button( __( 'Save', 'videoneat-index' ) );
	echo '</form></div>';
}

/* ---------------------------------------------------------------- WP-CLI */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'videoneat-index rebuild', function ( $args, $assoc ) {
		$pt  = ! isset( $assoc['no-peertube'] );
		$ids = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'fields' => 'ids', 'posts_per_page' => -1, 'suppress_filters' => true ) );
		$bar = \WP_CLI\Utils\make_progress_bar( 'Indexing', count( $ids ) );
		foreach ( $ids as $id ) {
			vni_index_post( $id, $pt );
			$bar->tick();
		}
		$bar->finish();
		delete_transient( VNI_CACHE );
		$d = vni_build_index();
		WP_CLI::success( sprintf( 'Catalog generated: %d titles.', $d['count'] ) );
	}, array( 'shortdesc' => 'Reindex all posts and regenerate the JSON catalog.' ) );
	WP_CLI::add_command( 'videoneat-index stats', function () {
		foreach ( vni_stats() as $k => $v ) {
			WP_CLI::line( str_pad( $k, 16 ) . $v );
		}
	}, array( 'shortdesc' => 'Show coverage (how many titles have a PeerTube trailer).' ) );
}
