//@ts-nocheck
namespace $ {

	const Mimpl = $mpds_cifplayer_lib_math.all()

	const startswith = ( str: string, prefix: string ) => {
		return str.indexOf( prefix ) === 0
	}

	export function $mpds_cifplayer_matinfio_cif_to_obj( str: string ) {
		var structures = [],
			symops = [],
			atprop_seq = [],
			lines = str.toString().replace( /(\r\n|\r)/gm, "\n" ).split( "\n" ),
			cur_structure = {
				cell: {} as any,
				atoms: [],
				cartesian: false,
				mpds_demo: false,
			} as any,
			loop_active = false,
			new_structure = false,
			symops_active = false,
			data_info = "",
			cur_line = "",
			fingerprt = "",
			line_data = [],
			symmetry_seq = [],
			cell_props = [ 'a', 'b', 'c', 'alpha', 'beta', 'gamma' ],
			loop_vals = [ '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z' ],
			atom_props = [ 'label', 'symbol', 'x', 'y', 'z' ],
			chem_element_idxs = [ 0, 1 ],
			overlayed_idxs = []

		for( var oprop in $mpds_cifplayer_matinfio_custom_atom_loop_props ) {
			overlayed_idxs.push( loop_vals.length )
			loop_vals.push( oprop )
		}

		for( let i = 0; i < lines.length; i++ ) {
			if( startswith( lines[ i ], '#' ) ) continue
			cur_line = lines[ i ].trim()
			if( !cur_line ) {
				loop_active = false, atprop_seq = [], symops_active = false
				continue
			}
			fingerprt = cur_line.toLowerCase()
			new_structure = false

			if( startswith( fingerprt, 'data_' ) ) {
				new_structure = true,
					loop_active = false,
					atprop_seq = [],
					symops_active = false,
					data_info = cur_line.substr( 5 )

			} else if( startswith( fingerprt, '_cell_' ) ) {
				loop_active = false
				line_data = cur_line.split( " " )
				var cell_data = line_data[ 0 ].split( "_" ),
					cell_value = cell_data[ cell_data.length - 1 ]
				if( cell_props.indexOf( cell_value ) !== -1 && line_data[ line_data.length - 1 ] ) {

					if( cell_value == 'a' ) { // MPDS demo check
						var digits = line_data[ line_data.length - 1 ].split( '.' )
						if( digits[ digits.length - 1 ].length == 2 )
							cur_structure.mpds_demo = true
					}
					cur_structure.cell[ cell_value ] = parseFloat( line_data[ line_data.length - 1 ] )
				}
				continue

			} else if( startswith( fingerprt, '_symmetry_space_group_name_h-m' ) || startswith( fingerprt, '_space_group.patterson_name_h-m' ) ) {
				loop_active = false
				cur_structure.sg_name = lines[ i ].trim().substr( 31 ).replace( /"/g, '' ).replace( /'/g, '' )
				continue

			} else if( startswith( fingerprt, '_space_group.it_number' ) || startswith( fingerprt, '_space_group_it_number' ) || startswith( fingerprt, '_symmetry_int_tables_number' ) ) {
				loop_active = false
				line_data = cur_line.split( " " )
				cur_structure.ng_name = line_data[ line_data.length - 1 ].trim()
				continue

			} else if( startswith( fingerprt, '_cif_error' ) ) { // custom tag
				logger.error( cur_line.substr( 12, cur_line.length - 13 ) )
				return false

			} else if( startswith( fingerprt, '_pauling_file_entry' ) ) { // custom tag
				cur_structure.mpds_data = true
				continue

			} else if( startswith( fingerprt, 'loop_' ) ) {
				loop_active = true,
					atprop_seq = [],
					symops_active = false
				continue
			}

			if( loop_active ) {
				if( startswith( cur_line, '_symmetry_equiv' ) || startswith( cur_line, '_space_group' ) ) {
					symops_active = true
				} else if( startswith( cur_line, '_' ) ) {
					atprop_seq.push( cur_line )
				} else {
					if( symops_active ) {
						symops.push( cur_line.replace( /"/g, '' ).replace( /'/g, '' ) )
						continue
					}
					line_data = cur_line.replace( /\t/g, " " ).split( " " ).filter( function( o ) { return o ? true : false } )

					var atom = { 'overlays': {} },
						j = 0,
						len2 = atprop_seq.length // TODO handle in-loop mismatch

					for( ; j < len2; j++ ) {
						var atom_index = loop_vals.indexOf( atprop_seq[ j ] )
						if( atom_index == -1 ) continue
						var pos = chem_element_idxs.indexOf( atom_index )

						// NB label != symbol
						if( pos == 1 ) line_data[ j ] = line_data[ j ].charAt( 0 ).toUpperCase() + line_data[ j ].slice( 1 ).toLowerCase()
						else if( pos < 0 ) line_data[ j ] = parseFloat( line_data[ j ] ) // TODO: custom non-float props in loop

						// TODO: simplify this
						if( overlayed_idxs.indexOf( atom_index ) > -1 ) atom.overlays[ loop_vals[ atom_index ] ] = line_data[ j ]
						else atom[ atom_props[ atom_index ] ] = line_data[ j ]
					}
					if( atom.x !== undefined && atom.y !== undefined && atom.z !== undefined ) { // NB zero coord // TODO multiple relative loops with props
						if( atom.label ) {
							atom.overlays.label = atom.label
							if( !atom.symbol ) atom.symbol = atom.label.replace( /[0-9]/g, '' )
						}
						if( !$mpds_cifplayer_matinfio_chemical_elements.JmolColors[ atom.symbol ] && atom.symbol && atom.symbol.length > 1 ) atom.symbol = atom.symbol.substr( 0, atom.symbol.length - 1 )
						if( !!atom.symbol ) cur_structure.atoms.push( atom )
					}
				}
				continue
			}

			if( new_structure && cur_structure.atoms.length ) {
				cur_structure.info = data_info
				if( symops.length > 1 ) cur_structure.symops = symops
				structures.push( cur_structure )
				cur_structure = {
					'cell': {},
					'atoms': [],
					'cartesian': false
				},
					symops = []
			}
		}
		if( cur_structure.cell.gamma ) {
			cur_structure.info = data_info
			if( symops.length > 1 ) cur_structure.symops = symops
			structures.push( cur_structure )
		}
		//console.log(structures);

		if( structures.length ) return structures[ structures.length - 1 ] // TODO switch between frames
		else {
			logger.error( "Error: unexpected CIF format" )
			return false
		}
	}

	/** Convert internal repr into CIF */
	export function $mpds_cifplayer_matinfio_cif_from_obj( crystal: any ) {

		var cif_str = "data_matinfio\n",
			cell_abc,
			cell_mat

		if( Object.keys( crystal.cell ).length == 6 ) {
			cell_abc = crystal.cell
			cell_mat = $mpds_cifplayer_matinfio_cell_to_vec( crystal.cell )
			// cell_mat = this.cell2vec( ...( crystal.cell as [ number, number, number, number, number, number ] ) )
		} else {
			cell_abc = $mpds_cifplayer_matinfio_cell_from_vec( crystal.cell )
			cell_mat = crystal.cell
		}
		cif_str += "_cell_length_a    " + cell_abc[ 0 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_length_b    " + cell_abc[ 1 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_length_c    " + cell_abc[ 2 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_angle_alpha " + cell_abc[ 3 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_angle_beta  " + cell_abc[ 4 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_angle_gamma " + cell_abc[ 5 ].toFixed( 6 ) + "\n"

		cif_str += "_symmetry_space_group_name_H-M 'P1'\n_symmetry_Int_Tables_number 1\n"
		cif_str += "\nloop_" + "\n"
		cif_str += " _symmetry_equiv_pos_as_xyz" + "\n"
		cif_str += " +x,+y,+z" + "\n"

		cif_str += "\nloop_" + "\n"
		cif_str += " _atom_site_label" + "\n"
		cif_str += " _atom_site_type_symbol" + "\n"
		cif_str += " _atom_site_fract_x" + "\n"
		cif_str += " _atom_site_fract_y" + "\n"
		cif_str += " _atom_site_fract_z" + "\n"

		if( crystal.cartesian ) {

			//var t_cell_mat = Mimpl.transpose(cell_mat);
			var t_cell_mat = cell_mat
			//console.log(t_cell_mat);

			crystal.atoms.forEach( function( atom: any, i: number ) {
				//console.log([atom.x, atom.y, atom.z]);
				// TODO better test lusolve against usolve, lsolve etc.
				var solved = Mimpl.lusolve( t_cell_mat, [ atom.x, atom.y, atom.z ] ),
					fracs = Mimpl.transpose( solved )[ 0 ]

				//console.log(fracs);
				cif_str += " " + atom.symbol + ( i + 1 ) + "  " + atom.symbol + "  "
					+ fracs[ 0 ].toFixed( 3 ) + "  " + fracs[ 1 ].toFixed( 3 ) + "  " + fracs[ 2 ].toFixed( 3 ) + "\n"
			} )

		} else {
			crystal.atoms.forEach( function( atom: any, i: number ) {
				cif_str += " " + atom.symbol + ( i + 1 ) + "  " + atom.symbol + "  "
					+ atom.x.toFixed( 3 ) + "  " + atom.y.toFixed( 3 ) + "  " + atom.z.toFixed( 3 ) + "\n"
			} )
		}
		return cif_str
	}

}
