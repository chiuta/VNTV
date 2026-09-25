<?php
// Removes everything the VideoNeat Index plugin created.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'vni_settings' );
delete_option( 'vni_progress' );
delete_transient( 'vni_index_v1' );
delete_post_meta_by_key( '_vni_data' );
$up = wp_upload_dir();
if ( empty( $up['error'] ) ) {
	@unlink( trailingslashit( $up['basedir'] ) . 'videoneat-index.json' );
}
