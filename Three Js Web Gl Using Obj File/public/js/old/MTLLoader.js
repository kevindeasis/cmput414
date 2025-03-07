/**
 * Loads a Wavefront .mtl file specifying materials
 *
 * @author angelxuanchang
 */

THREE.MTLLoader = function( manager ) {

    this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.MTLLoader.prototype = {

    constructor: THREE.MTLLoader,

    load: function ( url, onLoad, onProgress, onError ) {

        var scope = this;

        var loader = new THREE.XHRLoader( this.manager );
        loader.setPath( this.path );
        loader.load( url, function ( text ) {

            onLoad( scope.parse( text ) );

        }, onProgress, onError );

    },

    setPath: function ( value ) {

        this.path = value;

    },

    setBaseUrl: function( value ) {

        // TODO: Merge with setPath()? Or rename to setTexturePath?

        this.baseUrl = value;

    },

    setCrossOrigin: function ( value ) {

        this.crossOrigin = value;

    },

    setMaterialOptions: function ( value ) {

        this.materialOptions = value;

    },

    /**
     * Parses loaded MTL file
     * @param text - Content of MTL file
     * @return {THREE.MTLLoader.MaterialCreator}
     */
    parse: function ( text ) {

        var lines = text.split( "\n" );
        var info = {};
        var delimiter_pattern = /\s+/;
        var materialsInfo = {};

        for ( var i = 0; i < lines.length; i ++ ) {

            var line = lines[ i ];
            line = line.trim();

            if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

                // Blank line or comment ignore
                continue;

            }

            var pos = line.indexOf( ' ' );

            var key = ( pos >= 0 ) ? line.substring( 0, pos ) : line;
            key = key.toLowerCase();

            var value = ( pos >= 0 ) ? line.substring( pos + 1 ) : "";
            value = value.trim();

            if ( key === "newmtl" ) {

                // New material

                info = { name: value };
                materialsInfo[ value ] = info;

            } else if ( info ) {

                if ( key === "ka" || key === "kd" || key === "ks" ) {

                    var ss = value.split( delimiter_pattern, 3 );
                    info[ key ] = [ parseFloat( ss[ 0 ] ), parseFloat( ss[ 1 ] ), parseFloat( ss[ 2 ] ) ];

                } else {

                    info[ key ] = value;

                }

            }

        }

        var materialCreator = new THREE.MTLLoader.MaterialCreator( this.baseUrl, this.materialOptions );
        materialCreator.setCrossOrigin( this.crossOrigin );
        materialCreator.setManager( this.manager );
        materialCreator.setMaterials( materialsInfo );
        return materialCreator;

    }

};

/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */

THREE.MTLLoader.MaterialCreator = function( baseUrl, options ) {

    this.baseUrl = baseUrl;
    this.options = options;
    this.materialsInfo = {};
    this.materials = {};
    this.materialsArray = [];
    this.nameLookup = {};

    this.side = ( this.options && this.options.side ) ? this.options.side : THREE.FrontSide;
    this.wrap = ( this.options && this.options.wrap ) ? this.options.wrap : THREE.RepeatWrapping;

};

THREE.MTLLoader.MaterialCreator.prototype = {

    constructor: THREE.MTLLoader.MaterialCreator,

    setCrossOrigin: function ( value ) {

        this.crossOrigin = value;

    },

    setManager: function ( value ) {

        this.manager = value;

    },

    setMaterials: function( materialsInfo ) {

        this.materialsInfo = this.convert( materialsInfo );
        this.materials = {};
        this.materialsArray = [];
        this.nameLookup = {};

    },

    convert: function( materialsInfo ) {

        if ( ! this.options ) return materialsInfo;

        var converted = {};

        for ( var mn in materialsInfo ) {

            // Convert materials info into normalized form based on options

            var mat = materialsInfo[ mn ];

            var covmat = {};

            converted[ mn ] = covmat;

            for ( var prop in mat ) {

                var save = true;
                var value = mat[ prop ];
                var lprop = prop.toLowerCase();

                switch ( lprop ) {

                    case 'kd':
                    case 'ka':
                    case 'ks':

                        // Diffuse color (color under white light) using RGB values

                        if ( this.options && this.options.normalizeRGB ) {

                            value = [ value[ 0 ] / 255, value[ 1 ] / 255, value[ 2 ] / 255 ];

                        }

                        if ( this.options && this.options.ignoreZeroRGBs ) {

                            if ( value[ 0 ] === 0 && value[ 1 ] === 0 && value[ 1 ] === 0 ) {

                                // ignore

                                save = false;

                            }

                        }

                        break;

                    default:

                        break;
                }

                if ( save ) {

                    covmat[ lprop ] = value;

                }

            }

        }

        return converted;

    },

    preload: function () {

        for ( var mn in this.materialsInfo ) {

            this.create( mn );

        }

    },

    getIndex: function( materialName ) {

        return this.nameLookup[ materialName ];

    },

    getAsArray: function() {

        var index = 0;

        for ( var mn in this.materialsInfo ) {

            this.materialsArray[ index ] = this.create( mn );
            this.nameLookup[ mn ] = index;
            index ++;

        }

        return this.materialsArray;

    },

    create: function ( materialName ) {

        if ( this.materials[ materialName ] === undefined ) {

            this.createMaterial_( materialName );

        }

        return this.materials[ materialName ];

    },

    createMaterial_: function ( materialName ) {

        // Create material

        var mat = this.materialsInfo[ materialName ];
        var params = {

            name: materialName,
            side: this.side

        };

        for ( var prop in mat ) {

            var value = mat[ prop ];

            if ( value === '' ) {
                continue;
            }

            switch ( prop.toLowerCase() ) {

                // Ns is material specular exponent

                case 'kd':

                    // Diffuse color (color under white light) using RGB values

                    params[ 'color' ] = new THREE.Color().fromArray( value );

                    break;

                case 'ks':

                    // Specular color (color when light is reflected from shiny surface) using RGB values
                    params[ 'specular' ] = new THREE.Color().fromArray( value );

                    break;

                case 'map_kd':

                    // Diffuse texture map

                    params[ 'map' ] = this.loadTexture( this.baseUrl + value );
                    params[ 'map' ].wrapS = this.wrap;
                    params[ 'map' ].wrapT = this.wrap;

                    break;

                case 'ns':

                    // The specular exponent (defines the focus of the specular highlight)
                    // A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.

                    params[ 'shininess' ] = parseFloat( value );

                    break;

                case 'd':

                    if ( value < 1 ) {

                        params[ 'opacity' ] = value;
                        params[ 'transparent' ] = true;

                    }

                    break;

                case 'Tr':

                    if ( value > 0 ) {

                        params[ 'opacity' ] = 1 - value;
                        params[ 'transparent' ] = true;

                    }

                    break;

                case 'map_bump':
                case 'bump':

                    // Bump texture map

                    if ( params[ 'bumpMap' ] ) break; // Avoid loading twice.

                    params[ 'bumpMap' ] = this.loadTexture( this.baseUrl + value );
                    params[ 'bumpMap' ].wrapS = this.wrap;
                    params[ 'bumpMap' ].wrapT = this.wrap;

                    break;

                default:
                    break;

            }

        }

        this.materials[ materialName ] = new THREE.MeshPhongMaterial( params );
        return this.materials[ materialName ];

    },


    loadTexture: function ( url, mapping, onLoad, onProgress, onError ) {

        var texture;
        var loader = THREE.Loader.Handlers.get( url );
        var manager = ( this.manager !== undefined ) ? this.manager : THREE.DefaultLoadingManager;

        if ( loader === null ) {

            loader = new THREE.TextureLoader( manager );

        }

        if ( loader.setCrossOrigin ) loader.setCrossOrigin( this.crossOrigin );
        texture = loader.load( url, onLoad, onProgress, onError );

        if ( mapping !== undefined ) texture.mapping = mapping;

        return texture;

    }

};

THREE.EventDispatcher.prototype.apply( THREE.MTLLoader.prototype );