
function DayEventRenderer() {
    var t = this;

	

	// exports
	t.renderDayEvents = renderDayEvents;
	t.draggableDayEvent = draggableDayEvent; // made public so that subclasses can override
	t.resizableDayEvent = resizableDayEvent; // "

	
//    // exports
//    t.renderDaySegs = renderDaySegs;
//    t.resizableDayEvent = resizableDayEvent;
	
	
//<<<<<<< HEAD
	// imports
	var opt = t.opt;
	var trigger = t.trigger;
	var isEventDraggable = t.isEventDraggable;
	var isEventResizable = t.isEventResizable;
	var eventEnd = t.eventEnd;
	var reportEventElement = t.reportEventElement;
	var eventElementHandlers = t.eventElementHandlers;
	var showEvents = t.showEvents;
	var hideEvents = t.hideEvents;
	var eventDrop = t.eventDrop;
	var eventResize = t.eventResize;
	var getRowCnt = t.getRowCnt;
	var getColCnt = t.getColCnt;
	var getColWidth = t.getColWidth;
	var allDayRow = t.allDayRow; // TODO: rename
	var colLeft = t.colLeft;
	var colRight = t.colRight;
	var colContentLeft = t.colContentLeft;
	var colContentRight = t.colContentRight;
	var dateToCell = t.dateToCell;
	var getDaySegmentContainer = t.getDaySegmentContainer;
	var formatDates = t.calendar.formatDates;
	var renderDayOverlay = t.renderDayOverlay;
	var clearOverlays = t.clearOverlays;
	var clearSelection = t.clearSelection;
	var getHoverListener = t.getHoverListener;
	var rangeToSegments = t.rangeToSegments;
	var segmentCompare = t.segmentCompare;
	var cellToDate = t.cellToDate;
	var cellToCellOffset = t.cellToCellOffset;
	var cellOffsetToDayOffset = t.cellOffsetToDayOffset;
	var dateToDayOffset = t.dateToDayOffset;
	var dayOffsetToCellOffset = t.dayOffsetToCellOffset;


	// Render `events` onto the calendar, attach mouse event handlers, and call the `eventAfterRender` callback for each.
	// Mouse event will be lazily applied, except if the event has an ID of `modifiedEventId`.
	// Can only be called when the event container is empty (because it wipes out all innerHTML).
	function renderDayEvents(events, modifiedEventId, resources) {
	
		// do the actual rendering. Receive the intermediate "segment" data structures.
		var segments = _renderDayEvents(
			events,
			false, // don't append event elements
			true, // set the heights of the rows
			resources
		);

		// report the elements to the View, for general drag/resize utilities
		segmentElementEach(segments, function(segment, element) {
			reportEventElement(segment.event, element);
		});

		// attach mouse handlers
		attachHandlers(segments, modifiedEventId);

		// call `eventAfterRender` callback for each event
		segmentElementEach(segments, function(segment, element) {
			trigger('eventAfterRender', segment.event, segment.event, element);
		});
	}


	// Render an event on the calendar, but don't report them anywhere, and don't attach mouse handlers.
	// Append this event element to the event container, which might already be populated with events.
	// If an event's segment will have row equal to `adjustRow`, then explicitly set its top coordinate to `adjustTop`.
	// This hack is used to maintain continuity when user is manually resizing an event.
	// Returns an array of DOM elements for the event.
	function renderTempDayEvent(event, adjustRow, adjustTop) {

		// actually render the event. `true` for appending element to container.
		// Recieve the intermediate "segment" data structures.
		var segments = _renderDayEvents(
			[ event ],
			true, // append event elements
			false // don't set the heights of the rows
		);

		var elements = [];

		// Adjust certain elements' top coordinates
		segmentElementEach(segments, function(segment, element) {
			if (segment.row === adjustRow) {
				element.css('top', adjustTop);
			}
			elements.push(element[0]); // accumulate DOM nodes
		});

		return elements;
	}


	// Render events onto the calendar. Only responsible for the VISUAL aspect.
	// Not responsible for attaching handlers or calling callbacks.
	// Set `doAppend` to `true` for rendering elements without clearing the existing container.
	// Set `doRowHeights` to allow setting the height of each row, to compensate for vertical event overflow.
	function _renderDayEvents(events, doAppend, doRowHeights, resources) {

		// where the DOM nodes will eventually end up
		var finalContainer = getDaySegmentContainer();

		// the container where the initial HTML will be rendered.
		// If `doAppend`==true, uses a temporary container.
		var renderContainer = doAppend ? $("<div/>") : finalContainer;

		// FIXME resourceView is not getting the correct segments
		// colLeft is always 0. should be the the column of the correct resource:
		// need to match resource to column and get correct height
		// can get col by resources[id = id]
		var segments = buildSegments(events);
		var html;
		var elements;

		// calculate the desired `left` and `width` properties on each segment object
		calculateHorizontals(segments);

		// build the HTML string. relies on `left` property
		html = buildHTML(segments, resources);

		// render the HTML. innerHTML is considerably faster than jQuery's .html()
		renderContainer[0].innerHTML = html;

		// retrieve the individual elements
		elements = renderContainer.children();

		// if we were appending, and thus using a temporary container,
		// re-attach elements to the real container.
		if (doAppend) {
			finalContainer.append(elements);
		}

		// assigns each element to `segment.event`, after filtering them through user callbacks
		resolveElements(segments, elements);

		// Calculate the left and right padding+margin for each element.
		// We need this for setting each element's desired outer width, because of the W3C box model.
		// It's important we do this in a separate pass from acually setting the width on the DOM elements
		// because alternating reading/writing dimensions causes reflow for every iteration.
		segmentElementEach(segments, function(segment, element) {
			segment.hsides = hsides(element, true); // include margins = `true`
		});

		// Set the width of each element
		segmentElementEach(segments, function(segment, element) {
			element.width(
				Math.max(0, segment.outerWidth - segment.hsides)
			);
		});

		// Grab each element's outerHeight (setVerticals uses this).
		// To get an accurate reading, it's important to have each element's width explicitly set already.
		segmentElementEach(segments, function(segment, element) {
			segment.outerHeight = element.outerHeight(true); // include margins = `true`
		});

		// Set the top coordinate on each element (requires segment.outerHeight)
		setVerticals(segments, doRowHeights);

		return segments;
	}


	// Generate an array of "segments" for all events.
	function buildSegments(events) {
		var segments = [];
		for (var i=0; i<events.length; i++) {
			var eventSegments = buildSegmentsForEvent(events[i]);
			segments.push.apply(segments, eventSegments); // append an array to an array
		}
		return segments;
	}


	// Generate an array of segments for a single event.
	// A "segment" is the same data structure that View.rangeToSegments produces,
	// with the addition of the `event` property being set to reference the original event.
	function buildSegmentsForEvent(event) {
		var startDate = event.start;
		var endDate = exclEndDay(event);
		var segments = rangeToSegments(startDate, endDate);
		for (var i=0; i<segments.length; i++) {
			segments[i].event = event;
		}
		return segments;
	}


	// Sets the `left` and `outerWidth` property of each segment.
	// These values are the desired dimensions for the eventual DOM elements.
	function calculateHorizontals(segments) {
		var isRTL = opt('isRTL');
		for (var i=0; i<segments.length; i++) {
			var segment = segments[i];

			// Determine functions used for calulating the elements left/right coordinates,
			// depending on whether the view is RTL or not.
			// NOTE:
			// colLeft/colRight returns the coordinate butting up the edge of the cell.
			// colContentLeft/colContentRight is indented a little bit from the edge.
			var leftFunc = (isRTL ? segment.isEnd : segment.isStart) ? colContentLeft : colLeft;
			var rightFunc = (isRTL ? segment.isStart : segment.isEnd) ? colContentRight : colRight;

			var left = leftFunc(segment.leftCol);
			var right = rightFunc(segment.rightCol);
			segment.left = left;
			segment.outerWidth = right - left;
		}
	}


	// Build a concatenated HTML string for an array of segments
	function buildHTML(segments, resources) {
		var html = '';
		for (var i=0; i<segments.length; i++) {
			html += buildHTMLForSegment(segments[i], resources);
		}
		return html;
	}


	// Build an HTML string for a single segment.
	// Relies on the following properties:
	// - `segment.event` (from `buildSegmentsForEvent`)
	// - `segment.left` (from `calculateHorizontals`)
	function buildHTMLForSegment(segment, resources) {
		var html = '';
		var isRTL = opt('isRTL');
		var event = segment.event;
		var url = event.url;

		// generate the list of CSS classNames
		var classNames = [ 'fc-event', 'fc-event-hori' ];
		if (isEventDraggable(event)) {
			classNames.push('fc-event-draggable');
		}
		if (segment.isStart) {
			classNames.push('fc-event-start');
		}
		if (segment.isEnd) {
			classNames.push('fc-event-end');
		}
		
		var leftCol, rightCol, left, right;
		
		left = segment.left
		if (!resources) {
		// do nothing if there are not resources
//            leftCol = dayOfWeekCol(segment.end.getDay()-1);
//            rightCol = dayOfWeekCol(segment.start.getDay());
//            left = segment.isEnd ? colContentLeft(leftCol) : minLeft;
//            right = segment.isStart ? colContentRight(rightCol) : maxLeft;
        } else {
            for (var j=0;j<resources.length;j++) {
                if (resources[j].id === event.resourceId) {
                    leftCol = j;
                    rightCol = j
                    left = colContentLeft(leftCol);
                    right = colContentRight(rightCol);
                }
            }
        }
		
		// use the event's configured classNames
		// guaranteed to be an array via `normalizeEvent`
		classNames = classNames.concat(event.className);
		if (event.source) {
			// use the event's source's classNames, if specified
			classNames = classNames.concat(event.source.className || []);
		}

		// generate a semicolon delimited CSS string for any of the "skin" properties
		// of the event object (`backgroundColor`, `borderColor` and such)
		var skinCss = getSkinCss(event, opt);

		if (url) {
			html += "<a href='" + htmlEscape(url) + "'";
		}else{
			html += "<div";
		}
		html +=
			" class='" + classNames.join(' ') + "'" +
			" style=" +
				"'" +
				"position:absolute;" +
				"left:" + left + "px;" +
				skinCss +
				"'" +
			">" +
			"<div class='fc-event-inner'>";
		// PA because resourceView clone events does have allDay undefined 
		// if the event is a clone then allDay should be true
		if (!event.allDay && segment.isStart && !event._isClone) {
			html +=
				"<span class='fc-event-time'>" +
				htmlEscape(
					formatDates(event.start, event.end, opt('timeFormat'))
				) +
				"</span>";
		}
		html +=
			"<span class='fc-event-title'>" +
			htmlEscape(event.title || '') +
			"</span>" +
			"</div>";
		//segment is not resizable in resource mode
		if (segment.isEnd && isEventResizable(event) && !resources) {
			html +=
				"<div class='ui-resizable-handle ui-resizable-" + (isRTL ? 'w' : 'e') + "'>" +
				"&nbsp;&nbsp;&nbsp;" + // makes hit area a lot better for IE6/7
				"</div>";
		}
		html += "</" + (url ? "a" : "div") + ">";

		// TODO:
		// When these elements are initially rendered, they will be briefly visibile on the screen,
		// even though their widths/heights are not set.
		// SOLUTION: initially set them as visibility:hidden ?

		return html;
	}


	// Associate each segment (an object) with an element (a jQuery object),
	// by setting each `segment.element`.
	// Run each element through the `eventRender` filter, which allows developers to
	// modify an existing element, supply a new one, or cancel rendering.
	function resolveElements(segments, elements) {
		for (var i=0; i<segments.length; i++) {
			var segment = segments[i];
			var event = segment.event;
			var element = elements.eq(i);

			// call the trigger with the original element
			var triggerRes = trigger('eventRender', event, event, element);

			if (triggerRes === false) {
				// if `false`, remove the event from the DOM and don't assign it to `segment.event`
				element.remove();
			}
			else {
				if (triggerRes && triggerRes !== true) {
					// the trigger returned a new element, but not `true` (which means keep the existing element)

					// re-assign the important CSS dimension properties that were already assigned in `buildHTMLForSegment`
					triggerRes = $(triggerRes)
						.css({
							position: 'absolute',
							left: segment.left
						});

					element.replaceWith(triggerRes);
					element = triggerRes;
				}

				segment.element = element;
			}
		}
	}



	/* Top-coordinate Methods
	-------------------------------------------------------------------------------------------------*/


	// Sets the "top" CSS property for each element.
	// If `doRowHeights` is `true`, also sets each row's first cell to an explicit height,
	// so that if elements vertically overflow, the cell expands vertically to compensate.
	function setVerticals(segments, doRowHeights) {
		var rowContentHeights = calculateVerticals(segments); // also sets segment.top
		var rowContentElements = getRowContentElements(); // returns 1 inner div per row
		var rowContentTops = [];

		// Set each row's height by setting height of first inner div
		if (doRowHeights) {
			for (var i=0; i<rowContentElements.length; i++) {
				rowContentElements[i].height(rowContentHeights[i]);
			}
		}

		// Get each row's top, relative to the views's origin.
		// Important to do this after setting each row's height.
		for (var i=0; i<rowContentElements.length; i++) {
			rowContentTops.push(
				rowContentElements[i].position().top
			);
		}

		// Set each segment element's CSS "top" property.
		// Each segment object has a "top" property, which is relative to the row's top, but...
		segmentElementEach(segments, function(segment, element) {
			element.css(
				'top',
				rowContentTops[segment.row] + segment.top // ...now, relative to views's origin
			);
		});
	}


	// Calculate the "top" coordinate for each segment, relative to the "top" of the row.
	// Also, return an array that contains the "content" height for each row
	// (the height displaced by the vertically stacked events in the row).
	// Requires segments to have their `outerHeight` property already set.
	function calculateVerticals(segments) {
		var rowCnt = getRowCnt();
		var colCnt = getColCnt();
		var rowContentHeights = []; // content height for each row
		var segmentRows = buildSegmentRows(segments); // an array of segment arrays, one for each row

		for (var rowI=0; rowI<rowCnt; rowI++) {
			var segmentRow = segmentRows[rowI];

			// an array of running total heights for each column.
			// initialize with all zeros.
			var colHeights = [];
			for (var colI=0; colI<colCnt; colI++) {
				colHeights.push(0);
			}

			// loop through every segment
			for (var segmentI=0; segmentI<segmentRow.length; segmentI++) {
				var segment = segmentRow[segmentI];

				// find the segment's top coordinate by looking at the max height
				// of all the columns the segment will be in.
				segment.top = arrayMax(
					colHeights.slice(
						segment.leftCol,
						segment.rightCol + 1 // make exclusive for slice
					)
				);

				// adjust the columns to account for the segment's height
				for (var colI=segment.leftCol; colI<=segment.rightCol; colI++) {
					colHeights[colI] = segment.top + segment.outerHeight;
				}
			}

			// the tallest column in the row should be the "content height"
			rowContentHeights.push(arrayMax(colHeights));
		}

		return rowContentHeights;
	}


	// Build an array of segment arrays, each representing the segments that will
	// be in a row of the grid, sorted by which event should be closest to the top.
	function buildSegmentRows(segments) {
		var rowCnt = getRowCnt();
		var segmentRows = [];
		var segmentI;
		var segment;
		var rowI;

		// group segments by row
		for (segmentI=0; segmentI<segments.length; segmentI++) {
			segment = segments[segmentI];
			rowI = segment.row;
			if (segment.element) { // was rendered?
				if (segmentRows[rowI]) {
					// already other segments. append to array
					segmentRows[rowI].push(segment);
				}
				else {
					// first segment in row. create new array
					segmentRows[rowI] = [ segment ];
				}
			}
		}

		// sort each row
		for (rowI=0; rowI<rowCnt; rowI++) {
			segmentRows[rowI] = sortSegmentRow(
				segmentRows[rowI] || [] // guarantee an array, even if no segments
			);
		}

		return segmentRows;
	}


	// Sort an array of segments according to which segment should appear closest to the top
	function sortSegmentRow(segments) {
		var sortedSegments = [];

		// build the subrow array
		var subrows = buildSegmentSubrows(segments);

		// flatten it
		for (var i=0; i<subrows.length; i++) {
			sortedSegments.push.apply(sortedSegments, subrows[i]); // append an array to an array
		}

		return sortedSegments;
	}


	// Take an array of segments, which are all assumed to be in the same row,
	// and sort into subrows.
	function buildSegmentSubrows(segments) {

		// Give preference to elements with certain criteria, so they have
		// a chance to be closer to the top.
		segments.sort(segmentCompare);

		var subrows = [];
		for (var i=0; i<segments.length; i++) {
			var segment = segments[i];

			// loop through subrows, starting with the topmost, until the segment
			// doesn't collide with other segments.
			for (var j=0; j<subrows.length; j++) {
				if (!isDaySegmentCollision(segment, subrows[j])) {
					break;
				}
			}
			// `j` now holds the desired subrow index
			if (subrows[j]) {
				subrows[j].push(segment);
			}
			else {
				subrows[j] = [ segment ];
			}
		}

		return subrows;
	}


	// Return an array of jQuery objects for the placeholder content containers of each row.
	// The content containers don't actually contain anything, but their dimensions should match
	// the events that are overlaid on top.
	function getRowContentElements() {
		var i;
		var rowCnt = getRowCnt();
		var rowDivs = [];
		for (i=0; i<rowCnt; i++) {
			rowDivs[i] = allDayRow(i)
				.find('div.fc-day-content > div');
		}
		return rowDivs;
	}



	/* Mouse Handlers
	---------------------------------------------------------------------------------------------------*/
	// TODO: better documentation!


	function attachHandlers(segments, modifiedEventId) {
		var segmentContainer = getDaySegmentContainer();

		segmentElementEach(segments, function(segment, element, i) {
			var event = segment.event;
			if (event._id === modifiedEventId) {
				bindDaySeg(event, element, segment);
			}else{
				element[0]._fci = i; // for lazySegBind
			}
		});

		lazySegBind(segmentContainer, segments, bindDaySeg);
	}


	function bindDaySeg(event, eventElement, segment) {

		if (isEventDraggable(event)) {
			t.draggableDayEvent(event, eventElement, segment); // use `t` so subclasses can override
		}

		if (
			segment.isEnd && // only allow resizing on the final segment for an event
			isEventResizable(event)
		) {
			t.resizableDayEvent(event, eventElement, segment); // use `t` so subclasses can override
		}

		// attach all other handlers.
		// needs to be after, because resizableDayEvent might stopImmediatePropagation on click
		eventElementHandlers(event, eventElement);
	}

//=======
//    // imports
//    var opt = t.opt;
//    var trigger = t.trigger;
//    var isEventDraggable = t.isEventDraggable;
//    var isEventResizable = t.isEventResizable;
//    var eventEnd = t.eventEnd;
//    var reportEventElement = t.reportEventElement;
//    var showEvents = t.showEvents;
//    var hideEvents = t.hideEvents;
//    var eventResize = t.eventResize;
//    var getRowCnt = t.getRowCnt;
//    var getColCnt = t.getColCnt;
//    var getColWidth = t.getColWidth;
//    var allDayRow = t.allDayRow;
//    var allDayBounds = t.allDayBounds;
//    var colContentLeft = t.colContentLeft;
//    var colContentRight = t.colContentRight;
//    var dayOfWeekCol = t.dayOfWeekCol;
//    var dateCell = t.dateCell;
//    var compileDaySegs = t.compileDaySegs;
//    var getDaySegmentContainer = t.getDaySegmentContainer;
//    var bindDaySeg = t.bindDaySeg; //TODO: streamline this
//    var formatDates = t.calendar.formatDates;
//    var renderDayOverlay = t.renderDayOverlay;
//    var clearOverlays = t.clearOverlays;
//    var clearSelection = t.clearSelection;
//	
//	
//	
//    /* Rendering
//	-----------------------------------------------------------------------------*/
////	
//	
//    function renderDaySegs(segs, modifiedEventId, resources) {
//        var segmentContainer = getDaySegmentContainer();
//        var rowDivs;
//        var rowCnt = getRowCnt();
//        var colCnt = getColCnt();
//        var i = 0;
//        var rowI;
//        var levelI;
//        var colHeights;
//        var j;
//        var segCnt = segs.length;
//        var seg;
//        var top;
//        var k;
//        segmentContainer[0].innerHTML = daySegHTML(segs, resources); // faster than .html()
//        daySegElementResolve(segs, segmentContainer.children());
//        daySegElementReport(segs);
//        daySegHandlers(segs, segmentContainer, modifiedEventId);
//        daySegCalcHSides(segs);
//        daySegSetWidths(segs);
//        daySegCalcHeights(segs);
//        rowDivs = getRowDivs();
//        // set row heights, calculate event tops (in relation to row top)
//        for (rowI=0; rowI<rowCnt; rowI++) {
//            levelI = 0;
//            colHeights = [];
//            for (j=0; j<colCnt; j++) {
//                colHeights[j] = 0;
//            }
//            while (i<segCnt && (seg = segs[i]).row == rowI) {
//                // loop through segs in a row
//                top = arrayMax(colHeights.slice(seg.startCol, seg.endCol));
//                seg.top = top;
//                top += seg.outerHeight;
//                for (k=seg.startCol; k<seg.endCol; k++) {
//                    colHeights[k] = top;
//                }
//                i++;
//            }
//            rowDivs[rowI].height(arrayMax(colHeights));
//        }
//        daySegSetTops(segs, getRowTops(rowDivs));
//    }
//	
//	
//    function renderTempDaySegs(segs, adjustRow, adjustTop) {
//        var tempContainer = $("<div/>");
//        var elements;
//        var segmentContainer = getDaySegmentContainer();
//        var i;
//        var segCnt = segs.length;
//        var element;
//        tempContainer[0].innerHTML = daySegHTML(segs); // faster than .html()
//        elements = tempContainer.children();
//        segmentContainer.append(elements);
//        daySegElementResolve(segs, elements);
//        daySegCalcHSides(segs);
//        daySegSetWidths(segs);
//        daySegCalcHeights(segs);
//        daySegSetTops(segs, getRowTops(getRowDivs()));
//        elements = [];
//        for (i=0; i<segCnt; i++) {
//            element = segs[i].element;
//            if (element) {
//                if (segs[i].row === adjustRow) {
//                    element.css('top', adjustTop);
//                }
//                elements.push(element[0]);
//            }
//        }
//        return $(elements);
//    }
//	
//	
//    function daySegHTML(segs, resources) { // also sets seg.left and seg.outerWidth
//        var rtl = opt('isRTL');
//        var i;
//        var segCnt=segs.length;
//        var seg;
//        var event;
//        var url;
//        var classes;
//        var bounds = allDayBounds();
//        var minLeft = bounds.left;
//        var maxLeft = bounds.right;
//        var leftCol;
//        var rightCol;
//        var left;
//        var right;
//        var skinCss;
//        var html = '';
//        // calculate desired position/dimensions, create html
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            event = seg.event;
//            classes = ['fc-event', 'fc-event-skin', 'fc-event-hori'];
//            if (isEventDraggable(event)) {
//                classes.push('fc-event-draggable');
//            }
//            if (rtl) {
//                if (seg.isStart) {
//                    classes.push('fc-corner-right');
//                }
//                if (seg.isEnd) {
//                    classes.push('fc-corner-left');
//                }
//                if (!resources) {
//                    leftCol = dayOfWeekCol(seg.end.getDay()-1);
//                    rightCol = dayOfWeekCol(seg.start.getDay());
//                    left = seg.isEnd ? colContentLeft(leftCol) : minLeft;
//                    right = seg.isStart ? colContentRight(rightCol) : maxLeft;
//                } else {
//                    for (var j=0;j<resources.length;j++) {
//                        if (resources[j].id === seg.event.resourceId) {
//                            leftCol = j;
//                            rightCol = j
//                            left = colContentLeft(leftCol);
//                            right = colContentRight(rightCol);
//                        }
//                    }
//                }
//            }else{
//                if (seg.isStart) {
//                    classes.push('fc-corner-left');
//                }
//                if (seg.isEnd) {
//                    classes.push('fc-corner-right');
//                }
//                if (!resources) {
//                    leftCol = dayOfWeekCol(seg.start.getDay());
//                    rightCol = dayOfWeekCol(seg.end.getDay()-1);
//                    left = seg.isStart ? colContentLeft(leftCol) : minLeft;
//                    right = seg.isEnd ? colContentRight(rightCol) : maxLeft;
//                } else {
//                    for (var j=0;j<resources.length;j++) {
//                        if (resources[j].id === seg.event.resourceId) {
//                            leftCol = j;
//                            rightCol = j
//                            left = colContentLeft(leftCol);
//                            right = colContentRight(rightCol);
//                        }
//                    }
//                }
//            }
//            classes = classes.concat(event.className);
//            if (event.source) {
//                classes = classes.concat(event.source.className || []);
//            }
//            url = event.url;
//            skinCss = getSkinCss(event, opt);
//            if (url) {
//                html += "<a href='" + htmlEscape(url) + "'";
//            }else{
//                html += "<div";
//            }
//            html +=
//            " class='" + classes.join(' ') + "'" +
//            " style='position:absolute;z-index:8;left:"+left+"px;" + skinCss + "'" +
//            ">" +
//            "<div" +
//            " class='fc-event-inner fc-event-skin'" +
//            (skinCss ? " style='" + skinCss + "'" : '') +
//            ">";
//            if (!event.allDay && seg.isStart) {
//                html +=
//                "<span class='fc-event-time'>" +
//                htmlEscape(formatDates(event.start, event.end, opt('timeFormat'))) +
//                "</span>";
//            }
//            html +=
//            "<span class='fc-event-title'>" + htmlEscape(event.title) + "</span>" +
//            "</div>";
//            if (seg.isEnd && isEventResizable(event)) {
//                html +=
//                "<div class='ui-resizable-handle ui-resizable-" + (rtl ? 'w' : 'e') + "'>" +
//                "&nbsp;&nbsp;&nbsp;" + // makes hit area a lot better for IE6/7
//                "</div>";
//            }
//            html +=
//            "</" + (url ? "a" : "div" ) + ">";
//            seg.left = left;
//            seg.outerWidth = right - left;
//            seg.startCol = leftCol;
//            seg.endCol = rightCol + 1; // needs to be exclusive
//        }
//        return html;
//    }
//	
//	
//    function daySegElementResolve(segs, elements) { // sets seg.element
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var event;
//        var element;
//        var triggerRes;
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            event = seg.event;
//            element = $(elements[i]); // faster than .eq()
//            triggerRes = trigger('eventRender', event, event, element);
//            if (triggerRes === false) {
//                element.remove();
//            }else{
//                if (triggerRes && triggerRes !== true) {
//                    triggerRes = $(triggerRes)
//                    .css({
//                        position: 'absolute',
//                        left: seg.left
//                    });
//                    element.replaceWith(triggerRes);
//                    element = triggerRes;
//                }
//                seg.element = element;
//            }
//        }
//    }
//	
//	
//    function daySegElementReport(segs) {
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var element;
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            element = seg.element;
//            if (element) {
//                reportEventElement(seg.event, element);
//            }
//        }
//    }
//	
//	
//    function daySegHandlers(segs, segmentContainer, modifiedEventId) {
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var element;
//        var event;
//        // retrieve elements, run through eventRender callback, bind handlers
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            element = seg.element;
//            if (element) {
//                event = seg.event;
//                if (event._id === modifiedEventId) {
//                    bindDaySeg(event, element, seg);
//                }else{
//                    element[0]._fci = i; // for lazySegBind
//                }
//            }
//        }
//        lazySegBind(segmentContainer, segs, bindDaySeg);
//    }
//	
//	
//    function daySegCalcHSides(segs) { // also sets seg.key
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var element;
//        var key, val;
//        var hsideCache = {};
//        // record event horizontal sides
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            element = seg.element;
//            if (element) {
//                key = seg.key = cssKey(element[0]);
//                val = hsideCache[key];
//                if (val === undefined) {
//                    val = hsideCache[key] = hsides(element, true);
//                }
//                seg.hsides = val;
//            }
//        }
//    }
//	
//	
//    function daySegSetWidths(segs) {
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var element;
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            element = seg.element;
//            if (element) {
//                element[0].style.width = Math.max(0, seg.outerWidth - seg.hsides) + 'px';
//            }
//        }
//    }
//	
//	
//    function daySegCalcHeights(segs) {
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var element;
//        var key, val;
//        var vmarginCache = {};
//        // record event heights
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            element = seg.element;
//            if (element) {
//                key = seg.key; // created in daySegCalcHSides
//                val = vmarginCache[key];
//                if (val === undefined) {
//                    val = vmarginCache[key] = vmargins(element);
//                }
//                seg.outerHeight = element[0].offsetHeight + val;
//            }
//        }
//    }
//	
//	
//    function getRowDivs() {
//        var i;
//        var rowCnt = getRowCnt();
//        var rowDivs = [];
//        for (i=0; i<rowCnt; i++) {
//            rowDivs[i] = allDayRow(i)
//            .find('td:first div.fc-day-content > div'); // optimal selector?
//        }
//        return rowDivs;
//    }
//	
//	
//    function getRowTops(rowDivs) {
//        var i;
//        var rowCnt = rowDivs.length;
//        var tops = [];
//        for (i=0; i<rowCnt; i++) {
//            tops[i] = rowDivs[i][0].offsetTop; // !!?? but this means the element needs position:relative if in a table cell!!!!
//        }
//        return tops;
//    }
//	
//	
//    function daySegSetTops(segs, rowTops) { // also triggers eventAfterRender
//        var i;
//        var segCnt = segs.length;
//        var seg;
//        var element;
//        var event;
//        for (i=0; i<segCnt; i++) {
//            seg = segs[i];
//            element = seg.element;
//            if (element) {
//                element[0].style.top = rowTops[seg.row] + (seg.top||0) + 'px';
//                event = seg.event;
//                trigger('eventAfterRender', event, event, element);
//            }
//        }
//    }
//>>>>>>> refs/remotes/ikelin/master
	
	function draggableDayEvent(event, eventElement) {
		var hoverListener = getHoverListener();
		var dayDelta;
		eventElement.draggable({
			delay: 50,
			opacity: opt('dragOpacity'),
			revertDuration: opt('dragRevertDuration'),
			start: function(ev, ui) {
				trigger('eventDragStart', eventElement, event, ev, ui);
				hideEvents(event, eventElement);
				hoverListener.start(function(cell, origCell, rowDelta, colDelta) {
					eventElement.draggable('option', 'revert', !cell || !rowDelta && !colDelta);
					clearOverlays();
					if (cell) {
						var origDate = cellToDate(origCell);
						var date = cellToDate(cell);
						dayDelta = dayDiff(date, origDate);
						renderDayOverlay(
							addDays(cloneDate(event.start), dayDelta),
							addDays(exclEndDay(event), dayDelta)
						);
					}else{
						dayDelta = 0;
					}
				}, ev, 'drag');
			},
			stop: function(ev, ui) {
				hoverListener.stop();
				clearOverlays();
				trigger('eventDragStop', eventElement, event, ev, ui);
				if (dayDelta) {
					eventDrop(this, event, dayDelta, 0, event.allDay, ev, ui);
				}else{
					eventElement.css('filter', ''); // clear IE opacity side-effects
					showEvents(event, eventElement);
				}
			}
		});
	}

	/* Resizing
	-----------------------------------------------------------------------------------*/
	
//<<<<<<< HEAD
	function resizableDayEvent(event, element, segment) {
		var isRTL = opt('isRTL');
		var direction = isRTL ? 'w' : 'e';
		var handle = element.find('.ui-resizable-' + direction); // TODO: stop using this class because we aren't using jqui for this
		var isResizing = false;
//=======
	
 
	
	
//    function resizableDayEvent(event, element, seg) {
//        var rtl = opt('isRTL');
//        var direction = rtl ? 'w' : 'e';
//        var handle = element.find('div.ui-resizable-' + direction);
//        var isResizing = false;
//>>>>>>> refs/remotes/ikelin/master
		
        // TODO: look into using jquery-ui mouse widget for this stuff
        disableTextSelection(element); // prevent native <a> selection for IE
        element
        .mousedown(function(ev) { // prevent native <a> selection for others
            ev.preventDefault();
        })
        .click(function(ev) {
            if (isResizing) {
                ev.preventDefault(); // prevent link from being visited (only method that worked in IE6)
                ev.stopImmediatePropagation(); // prevent fullcalendar eventClick handler from being called
            // (eventElementHandlers needs to be bound after resizableDayEvent)
            }
        });
		
//<<<<<<< HEAD
		handle.mousedown(function(ev) {
			if (ev.which != 1) {
				return; // needs to be left mouse button
			}
			isResizing = true;
			var hoverListener = getHoverListener();
			var rowCnt = getRowCnt();
			var colCnt = getColCnt();
			var elementTop = element.css('top');
			var dayDelta;
			var helpers;
			var eventCopy = $.extend({}, event);
			var minCellOffset = dayOffsetToCellOffset( dateToDayOffset(event.start) );
			clearSelection();
			$('body')
				.css('cursor', direction + '-resize')
				.one('mouseup', mouseup);
			trigger('eventResizeStart', this, event, ev);
			hoverListener.start(function(cell, origCell) {
				if (cell) {

					var origCellOffset = cellToCellOffset(origCell);
					var cellOffset = cellToCellOffset(cell);

					// don't let resizing move earlier than start date cell
					cellOffset = Math.max(cellOffset, minCellOffset);

					dayDelta =
						cellOffsetToDayOffset(cellOffset) -
						cellOffsetToDayOffset(origCellOffset);

					if (dayDelta) {
						eventCopy.end = addDays(eventEnd(event), dayDelta, true);
						var oldHelpers = helpers;

						helpers = renderTempDayEvent(eventCopy, segment.row, elementTop);
						helpers = $(helpers); // turn array into a jQuery object

						helpers.find('*').css('cursor', direction + '-resize');
						if (oldHelpers) {
							oldHelpers.remove();
						}

						hideEvents(event);
					}
					else {
						if (helpers) {
							showEvents(event);
							helpers.remove();
							helpers = null;
						}
					}
					clearOverlays();
					renderDayOverlay( // coordinate grid already rebuilt with hoverListener.start()
						event.start,
						addDays( exclEndDay(event), dayDelta )
						// TODO: instead of calling renderDayOverlay() with dates,
						// call _renderDayOverlay (or whatever) with cell offsets.
					);
				}
			}, ev);
//=======
//        handle.mousedown(function(ev) {
//            if (ev.which != 1) {
//                return; // needs to be left mouse button
//            }
//            isResizing = true;
//            var hoverListener = t.getHoverListener();
//            var rowCnt = getRowCnt();
//            var colCnt = getColCnt();
//            var dis = rtl ? -1 : 1;
//            var dit = rtl ? colCnt-1 : 0;
//            var elementTop = element.css('top');
//            var dayDelta;
//            var helpers;
//            var eventCopy = $.extend({}, event);
//            var minCell = dateCell(event.start);
//            clearSelection();
//            $('body')
//            .css('cursor', direction + '-resize')
//            .one('mouseup', mouseup);
//            trigger('eventResizeStart', this, event, ev);
//            hoverListener.start(function(cell, origCell) {
//                if (cell) {
//                    var r = Math.max(minCell.row, cell.row);
//                    var c = cell.col;
//                    if (rowCnt == 1) {
//                        r = 0; // hack for all-day area in agenda views
//                    }
//                    if (r == minCell.row) {
//                        if (rtl) {
//                            c = Math.min(minCell.col, c);
//                        }else{
//                            c = Math.max(minCell.col, c);
//                        }
//                    }
//                    dayDelta = (r*7 + c*dis+dit) - (origCell.row*7 + origCell.col*dis+dit);
//                    var newEnd = addDays(eventEnd(event), dayDelta, true);
//                    if (dayDelta) {
//                        eventCopy.end = newEnd;
//                        var oldHelpers = helpers;
//                        helpers = renderTempDaySegs(compileDaySegs([eventCopy]), seg.row, elementTop);
//                        helpers.find('*').css('cursor', direction + '-resize');
//                        if (oldHelpers) {
//                            oldHelpers.remove();
//                        }
//                        hideEvents(event);
//                    }else{
//                        if (helpers) {
//                            showEvents(event);
//                            helpers.remove();
//                            helpers = null;
//                        }
//                    }
//                    clearOverlays();
//                    renderDayOverlay(event.start, addDays(cloneDate(newEnd), 1)); // coordinate grid already rebuild at hoverListener.start
//                }
//            }, ev);
//>>>>>>> refs/remotes/ikelin/master
			
            function mouseup(ev) {
                trigger('eventResizeStop', this, event, ev);
                $('body').css('cursor', '');
                hoverListener.stop();
                clearOverlays();
                if (dayDelta) {
                    eventResize(this, event, dayDelta, 0, ev);
                // event redraw will clear helpers
                }
                // otherwise, the drag handler already restored the old events
				
				setTimeout(function() { // make this happen after the element's click event
					isResizing = false;
				},0);
			}
		});
	}
}



/* Generalized Segment Utilities
-------------------------------------------------------------------------------------------------*/


function isDaySegmentCollision(segment, otherSegments) {
	for (var i=0; i<otherSegments.length; i++) {
		var otherSegment = otherSegments[i];
		if (
			otherSegment.leftCol <= segment.rightCol &&
			otherSegment.rightCol >= segment.leftCol
		) {
			return true;
		}
	}
	return false;
}


function segmentElementEach(segments, callback) { // TODO: use in AgendaView?
	for (var i=0; i<segments.length; i++) {
		var segment = segments[i];
		var element = segment.element;
		if (element) {
			callback(segment, element, i);
		}
	}
}
