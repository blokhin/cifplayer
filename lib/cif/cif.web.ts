namespace $ {

	export class $mpds_cifplayer_lib_cif extends $mol_object2 {

		@ $mol_mem
		static all() {
			return require( '../mpds/cifplayer/lib/cif/cif.js' ) as typeof import( '../cif/build/index' )
		}

		@ $mol_mem
		static loader() {
			$mol_wire_solid()
			const CIFLoader = this.all().CIFLoader
			const loader = new CIFLoader()
			return loader
		}

	}

}
