namespace $ {

	export function $mpds_cifplayer_matinfio_optimade_to_obj( this: $, str: string ) {
		const payload = JSON.parse( str )
		const atoms: any[] = []
		const src = payload?.data?.[ 0 ] ?? payload

		if( !src ) {
			this.$mpds_cifplayer_matinfio_log.error( "Error: unexpected OPTIMADE format" )
			return false
		}

		var n_atoms = src.attributes.cartesian_site_positions.length
		if( !n_atoms ) {
			this.$mpds_cifplayer_matinfio_log.error( "Error: no atomic positions found" )
			return false
		}

		if( src.attributes.species && src.attributes.species[ n_atoms - 1 ] && src.attributes.species[ n_atoms - 1 ].chemical_symbols ) {
			src.attributes.species.forEach( function( item: any, idx: any ) {
				atoms.push( {
					'x': src.attributes.cartesian_site_positions[ idx ][ 0 ],
					'y': src.attributes.cartesian_site_positions[ idx ][ 1 ],
					'z': src.attributes.cartesian_site_positions[ idx ][ 2 ],
					'symbol': item.chemical_symbols[ 0 ] // NB chemical_symbols.length > 1 ?
				} )
			} )
		} else if( src.attributes.species_at_sites ) { // TODO support *elements*
			src.attributes.species_at_sites.forEach( function( item: any, idx: any ) {
				atoms.push( {
					'x': src.attributes.cartesian_site_positions[ idx ][ 0 ],
					'y': src.attributes.cartesian_site_positions[ idx ][ 1 ],
					'z': src.attributes.cartesian_site_positions[ idx ][ 2 ],
					'symbol': item.replace( /\W+/, '' ).replace( /\d+/, '' ),
					'overlays': { 'label': item }
				} )
			} )
		} else {
			this.$mpds_cifplayer_matinfio_log.error( "Error: no atomic data found" )
			return false
		}

		return {
			'cell': src.attributes.lattice_vectors,
			'atoms': atoms,
			'info': 'id=' + src.id,
			'cartesian': true
		}
	}
	
}
