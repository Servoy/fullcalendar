/*
 * Responsible for resources.  Resource source object is anything that provides
 * data about resources.  It can be function, a JSON object or URL to a JSON 
 * feed.
*/


function ResourceManager(options) {
    var t = this;
	
    // exports
    t.fetchResources = fetchResources;
    t.removeResource = removeResource
	t.addResource = addResource;
    
    //imports
	var reportResources = t.reportResources;

    
    // local
    var sources = [];  // sourdce array
    var cache;  // cached resources
    
    _addResourceSources(options['resources']);


    /**
     * Remove the resource
     * Provide resource id or the same resource object that needs to be removed
     * */
    function removeResource(resource){
    	_removeResourceSource(resource)
		fetchResources(false)					// updates the cache
		reportResources()						// call reportResource to update the view
    }
    
    /**
     * Add a new resource
     * */
	function addResource(resource){
		var _sources = sources.map( function(src) {   // clone object to avoid side-effects
			return $.extend(true, {}, src.resources)
		});
		sources = []
		_sources.push(resource)
    	_addResourceSources(_sources)           // parse all resources
		fetchResources(false)					// updates the cache
		reportResources()					    // call reportResource to update the view
		
	}
    
    /**
     * ----------------------------------------------------------------
     * Categorize and add the provided sources
     * ----------------------------------------------------------------
     */
    function _addResourceSources(_sources) {
        var source = {};
        
        if ($.isFunction(_sources)) {
            // is it a function?
            source = {
                resources: _sources
            };
            sources.push(source);
        } else if (typeof _sources == 'string') {
            // is it a URL string?
            source = {
                url: _sources
            };
            sources.push(source);
        } else if (typeof _sources == 'object') {
            // is it json object?
            for (var i=0; i<_sources.length; i++) {
                var s = _sources[i];
                normalizeSource(s);
                source = {
                    resources: s
                };
                sources.push(source);
            }
        }
    }
    
    /**
     * ----------------------------------------------------------------
     * Remove the provided source
     * ----------------------------------------------------------------
     */
    function _removeResourceSource(_source) {
        
        if (typeof _source == 'string' || typeof _source == 'number') {
            // is it an ID ?            
            sources = $.grep(sources, function(src) {
				return src.resources.id == _source
			}); 
            cache = $.grep(cache, function(e) {
				return e.id == _source
			}); 
            
        } else if (typeof _source == 'object') {
            // is it json object?
			sources = $.grep(sources, function(src) {		// filter the source
				normalizeSource(_source)
				return !isSourcesEqual(src.resources, _source);
			});  
            cache = $.grep(cache, function(e) { 			// filter the cache
				return e.source == _source
			}); 
        }
        
    }


    /**
     * ----------------------------------------------------------------
     * Fetch resources from source array
     * ----------------------------------------------------------------
     */
    function fetchResources(useCache) {
        // if useCache is not defined, default to true
        useCache = typeof useCache !== 'undefined' ? useCache : true;
        
        if (cache != undefined && useCache) {
            // get from cache
            return cache;
        } else {
            // do a fetch resource from source, rebuild cache
            cache = [];
            var len = sources.length;
            for (var i = 0; i < len; i++) {
                var resources = _fetchResourceSource(sources[i]);
                cache = cache.concat(resources);
            }
            return cache;
        }
    }
    
    
    /**
     * ----------------------------------------------------------------
     * Fetch resources from each source.  If source is a function, call
     * the function and return the resource.  If source is a URL, get
     * the data via synchronized ajax call.  If the source is an
     * object, return it as is.
     * ----------------------------------------------------------------
     */
    function _fetchResourceSource(source) {
        var resources = source.resources;
        if (resources) {
            if ($.isFunction(resources)) {
                return resources();
            }
        } else {
            var url = source.url;
            if (url) {
                $.ajax({
                    url: url,
                    dataType: 'json',
                    cache: false,
                    success: function(res) {
                        res = res || [];
                        resources = res;
                    },
                    error: function() {
                        alert("ajax error");
                    },
                    async: false  // too much work coordinating callbacks so dumb it down
                });
            }
        }
        return resources;
    }
    
    
    /**
     * ----------------------------------------------------------------
     * normalize the source object
     * ----------------------------------------------------------------
     */
    function normalizeSource(source) {
        if (source.className) {
            if (typeof source.className == 'string') {
                source.className = source.className.split(/\s+/);
            }
        }else{
            source.className = [];
        }
        var normalizers = fc.sourceNormalizers;
        for (var i=0; i<normalizers.length; i++) {
            normalizers[i](source);
        }
    }
    
    /**
     * FIXME: PA should delete the same exact object
     * Check if resource are equal
     * Are considered equale if have same name and id
     * 
     * */
	function isSourcesEqual(source1, source2) {
		return source1 && source2 && source1.name == source2.name && source1.id == source2.id;
	}

	
}
