
setDefaults({
    allDaySlot: true,
    allDayText: 'all-day',
    firstHour: 6,
    slotMinutes: 30,
    defaultEventMinutes: 120,
    axisFormat: 'h(:mm)tt',
    timeFormat: {
        agenda: 'h:mm{ - h:mm}',
		resourceDay: 'h:mm{ - h:mm}'
    },
    dragOpacity: {
        agenda: .5,
		resourceDay: .5
    },
    minTime: 0,
    maxTime: 24,
	slotEventOverlap: true

});


// TODO: make it work in quirks mode (event corners, all-day height)
// TODO: test liquid width, especially in IE6


function ResourceView(element, calendar, viewName) {
    var t = this;
	
	
    // exports
    t.renderResource = renderResource;
    t.setWidth = setWidth;
    t.setHeight = setHeight;
    t.beforeHide = beforeHide;
    t.afterShow = afterShow;
    t.defaultEventEnd = defaultEventEnd;
    t.timePosition = timePosition;
    t.dayOfWeekCol = dayOfWeekCol;
    t.dateCell = dateCell;
    t.cellDate = cellDate;
    t.cellIsAllDay = cellIsAllDay;
    t.allDayRow = getAllDayRow;
    t.allDayBounds = allDayBounds;
    t.getHoverListener = function() { return hoverListener };
	t.colLeft = colLeft;
	t.colRight = colRight;
    t.colContentLeft = colContentLeft;
    t.colContentRight = colContentRight;
    t.getDaySegmentContainer = function() { return daySegmentContainer };
    t.getSlotSegmentContainer = function() { return slotSegmentContainer };
    t.getMinMinute = function() { return minMinute };
    t.getMaxMinute = function() { return maxMinute };
    t.getBodyContent = function() { return slotContent }; // !!??
    t.getRowCnt = function() { return 1 };
    t.getColCnt = function() { return colCnt };
    t.getColWidth = function() { return colWidth };
    t.getSlotHeight = function() { return slotHeight };
    t.defaultSelectionEnd = defaultSelectionEnd;
    t.renderDayOverlay = renderDayOverlay;
    t.renderSelection = renderSelection;
    t.clearSelection = clearSelection;
    t.reportDayClick = reportDayClick; // selection mousedown hack
	t.reportDayRightClick = reportDayRightClick; //@author paronne SBAP-128/3 rightClick
    t.dragStart = dragStart;
    t.dragStop = dragStop;
    t.resourceCol = resourceCol;
    t.resources = calendar.fetchResources();
	t.getAnnotationSegmentContainer = function() { return annotationSegmentContainer };
    t.renderAnnotations = renderAnnotations;
	
    // imports
    View.call(t, element, calendar, viewName);
    OverlayManager.call(t);
    SelectionManager.call(t);
    ResourceEventRenderer.call(t);
    var opt = t.opt;
    var trigger = t.trigger;
    var clearEvents = t.clearEvents;
    var renderOverlay = t.renderOverlay;
    var clearOverlays = t.clearOverlays;
    var reportSelection = t.reportSelection;
    var unselect = t.unselect;
    //var daySelectionMousedown = t.daySelectionMousedown;  // redefine here
    var slotSegHtml = t.slotSegHtml;
    var formatDate = calendar.formatDate;
    
    
    // locals
	
    var dayTable;
    var dayHead;
    var dayHeadCells;
    var dayBody;
    var dayBodyCells;
    var dayBodyCellInners;
    var dayBodyCellContentInners;
    var dayBodyFirstCell;
    var dayBodyFirstCellStretcher;
    var slotLayer;
    var daySegmentContainer;
    var allDayTable;
    var allDayRow;
    var slotScroller;
    var slotContent;
    var slotSegmentContainer;
    var slotTable;
    var slotTableFirstInner;
    var axisFirstCells;
    var gutterCells;
    var selectionHelper;
	
    var viewWidth;
    var viewHeight;
    var axisWidth;
    var colWidth;
    var gutterWidth;
    var slotHeight; // TODO: what if slotHeight changes? (see issue 650)
    var savedScrollTop;
	
    var colCnt;
    var slotCnt;
    var coordinateGrid;
    var hoverListener;
    var colPositions;
    var colContentPositions;
    var slotTopCache = {};
	
    var tm;
    var firstDay;
    var nwe;            // no weekends (int)
    var rtl, dis, dit;  // day index sign / translate
    var minMinute, maxMinute;
    var colFormat;
    var resources = t.resources;
	var annotationSegmentContainer;

    
    
    /* Rendering
	-----------------------------------------------------------------------------*/
	
	
    disableTextSelection(element.addClass('fc-agenda'));

	
    function renderResource() {
        colCnt = resources.length;
        updateOptions();
        if (!dayTable) {
            buildSkeleton();
        }else{
            clearEvents();
        }
        updateCells();
    }
	
	
	
    function updateOptions() {
        tm = opt('theme') ? 'ui' : 'fc';
        nwe = opt('weekends') ? 0 : 1;
        firstDay = opt('firstDay');
        if (rtl = opt('isRTL')) {
            dis = -1;
            dit = colCnt - 1;
        }else{
            dis = 1;
            dit = 0;
        }
        minMinute = parseTime(opt('minTime'));
        maxMinute = parseTime(opt('maxTime'));
        colFormat = opt('columnFormat');
    }
	
	
	
    function buildSkeleton() {
        var headerClass = tm + "-widget-header";
        var contentClass = tm + "-widget-content";
        var s;
        var i;
        var d;
        var maxd;
        var minutes;
        var slotNormal = opt('slotMinutes') % 15 == 0;
		
        s =
        "<table style='width:100%' class='fc-agenda-days fc-border-separate' cellspacing='0'>" +
        "<thead>" +
        "<tr>" +
        "<th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
        for (i=0; i<colCnt; i++) {
            s +=
            "<th class='fc- fc-col" + i + ' ' + headerClass + "'/>"; // fc- needed for setDayID
        }
        s +=
        "<th class='fc-agenda-gutter " + headerClass + "'>&nbsp;</th>" +
        "</tr>" +
        "</thead>" +
        "<tbody>" +
        "<tr>" +
        "<th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
        for (i=0; i<colCnt; i++) {
            s +=
            "<td class='fc- fc-col" + i + ' ' + contentClass + "'>" + // fc- needed for setDayID
            "<div>" +
            "<div class='fc-day-content'>" +
            "<div style='position:relative'>&nbsp;</div>" +
            "</div>" +
            "</div>" +
            "</td>";
        }
        s +=
        "<td class='fc-agenda-gutter " + contentClass + "'>&nbsp;</td>" +
        "</tr>" +
        "</tbody>" +
        "</table>";
        dayTable = $(s).appendTo(element);
        dayHead = dayTable.find('thead');
        dayHeadCells = dayHead.find('th').slice(1, -1);
        dayBody = dayTable.find('tbody');
        dayBodyCells = dayBody.find('td').slice(0, -1);
        dayBodyCellInners = dayBodyCells.find('> div');
        dayBodyCellContentInners = dayBodyCells.find('.fc-day-content > div');
        
        dayBodyFirstCell = dayBodyCells.eq(0);
        dayBodyFirstCellStretcher = dayBodyFirstCell.find('> div');
		//dayBodyFirstCellStretcher = dayBodyCellInners.eq(0) 
        
        markFirstLast(dayHead.add(dayHead.find('tr')));
        markFirstLast(dayBody.add(dayBody.find('tr')));
		
        axisFirstCells = dayHead.find('th:first');
        gutterCells = dayTable.find('.fc-agenda-gutter');
		
        slotLayer =
        $("<div style='position:absolute;z-index:2;left:0;width:100%'/>")
        .appendTo(element);
				
        if (opt('allDaySlot')) {
		
            daySegmentContainer =
            $("<div style='position:absolute;z-index:8;top:0;left:0'/>")
            .appendTo(slotLayer);
		
            s =
            "<table style='width:100%' class='fc-agenda-allday' cellspacing='0'>" +
            "<tr>" +
            "<th class='" + headerClass + " fc-agenda-axis'>" + opt('allDayText') + "</th>" +
            "<td>" +
            "<div class='fc-day-content'><div style='position:relative'/></div>" +
            "</td>" +
            "<th class='" + headerClass + " fc-agenda-gutter'>&nbsp;</th>" +
            "</tr>" +
            "</table>";
            allDayTable = $(s).appendTo(slotLayer);
            allDayRow = allDayTable.find('tr');
			
            dayBind(allDayRow.find('td'));
			
            axisFirstCells = axisFirstCells.add(allDayTable.find('th:first'));
            gutterCells = gutterCells.add(allDayTable.find('th.fc-agenda-gutter'));
			
            slotLayer.append(
                "<div class='fc-agenda-divider " + headerClass + "'>" +
                "<div class='fc-agenda-divider-inner'/>" +
                "</div>"
                );
			
        }else{
		
            daySegmentContainer = $([]); // in jQuery 1.4, we can just do $()
		
        }
		
        slotScroller =
        $("<div style='position:absolute;width:100%;overflow-x:hidden;overflow-y:auto'/>")
        .appendTo(slotLayer);
				
        slotContent =
        $("<div style='position:relative;width:100%;overflow:hidden'/>")
        .appendTo(slotScroller);
				
        slotSegmentContainer =
        $("<div style='position:absolute;z-index:8;top:0;left:0'/>")
        .appendTo(slotContent);
		
		annotationSegmentContainer =
		$("<div style='position:absolute;z-index:-1;top:0;left:0'/>")
			.appendTo(slotContent);
        
        s =
        "<table class='fc-agenda-slots' style='width:100%' cellspacing='0'>" +
        "<tbody>";
        d = zeroDate();
        maxd = addMinutes(cloneDate(d), maxMinute);
        addMinutes(d, minMinute);
        slotCnt = 0;
        for (i=0; d < maxd; i++) {
            minutes = d.getMinutes();
            s +=
            "<tr class='fc-slot" + i + ' ' + (!minutes ? '' : 'fc-minor') + "'>" +
            "<th class='fc-agenda-axis " + headerClass + "'>" +
            ((!slotNormal || !minutes) ? formatDate(d, opt('axisFormat')) : '&nbsp;') +
            "</th>" +
            "<td class='" + contentClass + "'>" +
            "<div style='position:relative'>&nbsp;</div>" +
            "</td>" +
            "</tr>";
            addMinutes(d, opt('slotMinutes'));
            slotCnt++;
        }
        s +=
        "</tbody>" +
        "</table>";
        slotTable = $(s).appendTo(slotContent);
        slotTableFirstInner = slotTable.find('div:first');
		
        slotBind(slotTable.find('td'));
		
        axisFirstCells = axisFirstCells.add(slotTable.find('th:first'));
    }
	
	
	
    function updateCells() {
        var i;
        var headCell;
        var bodyCell;
        var date;
        var today = clearTime(new Date());
        for (i=0; i<colCnt; i++) {
            date = resourceDate(i);
            headCell = dayHeadCells.eq(i);
            headCell.html(resources[i].name);
            headCell.attr("id", resources[i].id);
            bodyCell = dayBodyCells.eq(i);
            if (+date == +today) {
                bodyCell.addClass(tm + '-state-highlight fc-today');
            }else{
                bodyCell.removeClass(tm + '-state-highlight fc-today');
            }
            setDayID(headCell.add(bodyCell), date);
        }
    }
	
	
	
    function setHeight(height, dateChanged) {
        if (height === undefined) {
            height = viewHeight;
        }
        viewHeight = height;
        slotTopCache = {};
	
        var headHeight = dayBody.position().top;
        var allDayHeight = slotScroller.position().top; // including divider
        var bodyHeight = Math.min( // total body height, including borders
            height - headHeight,   // when scrollbars
            slotTable.height() + allDayHeight + 1 // when no scrollbars. +1 for bottom border
            );
		
        dayBodyFirstCellStretcher
        .height(bodyHeight - vsides(dayBodyFirstCell));
		
        slotLayer.css('top', headHeight);
		
        slotScroller.height(bodyHeight - allDayHeight - 1);
		
        slotHeight = slotTableFirstInner.height() + 1; // +1 for border
		
        if (dateChanged) {
            resetScroll();
        }
    }
	
	
	
    function setWidth(width) {
        viewWidth = width;
        colPositions.clear();
        colContentPositions.clear();
		
        axisWidth = 0;
        setOuterWidth(
            axisFirstCells
            .width('')
            .each(function(i, _cell) {
                axisWidth = Math.max(axisWidth, $(_cell).outerWidth());
            }),
            axisWidth
            );
		
        var slotTableWidth = slotScroller[0].clientWidth; // needs to be done after axisWidth (for IE7)
        //slotTable.width(slotTableWidth);
		
        gutterWidth = slotScroller.width() - slotTableWidth;
        if (gutterWidth) {
            setOuterWidth(gutterCells, gutterWidth);
            gutterCells
            .show()
            .prev()
            .removeClass('fc-last');
        }else{
            gutterCells
            .hide()
            .prev()
            .addClass('fc-last');
        }
		
        colWidth = Math.floor((slotTableWidth - axisWidth) / colCnt);
        setOuterWidth(dayHeadCells.slice(0, -1), colWidth);
    }
	


    function resetScroll() {
        var d0 = zeroDate();
        var scrollDate = cloneDate(d0);
        scrollDate.setHours(opt('firstHour'));
        var top = timePosition(d0, scrollDate) + 1; // +1 for the border
        function scroll() {
            slotScroller.scrollTop(top);
        }
        scroll();
        setTimeout(scroll, 0); // overrides any previous scroll state made by the browser
    }
	
	
    function beforeHide() {
        savedScrollTop = slotScroller.scrollTop();
    }
	
	
    function afterShow() {
        slotScroller.scrollTop(savedScrollTop);
    }
	
	
	
    /* Slot/Day clicking and binding
	-----------------------------------------------------------------------*/
	

    function dayBind(cells) {
        cells.click(slotClick)
        	.mousedown(daySelectionMousedown);
    }


    function slotBind(cells) {
        cells.click(slotClick)
	        .mousedown(slotSelectionMousedown)
			.bind('contextmenu', function(ev){ //@author paronne: SBAP 128/3 rightClick. Block contextmenu on rightClick
				ev.preventDefault();
				return false;
			});
    }
	
	
    function slotClick(ev) {
        if (!opt('selectable')) { // if selectable, SelectionManager will worry about dayClick
            var col = Math.min(colCnt-1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / colWidth));
            var date = resourceDate(col);
            var rowMatch = this.parentNode.className.match(/fc-slot(\d+)/); // TODO: maybe use data
            if (rowMatch) {
                var mins = parseInt(rowMatch[1]) * opt('slotMinutes');
                var hours = Math.floor(mins/60);
                date.setHours(hours);
                date.setMinutes(mins%60 + minMinute);
                trigger('dayClick', dayBodyCells[col], date, false, ev);
            }else{
                trigger('dayClick', dayBodyCells[col], date, true, ev);
            }
        }
    }
	
	
	
    /* Semi-transparent Overlay Helpers
	-----------------------------------------------------*/
	
    
    function renderDayOverlay(startDate, endDate, refreshCoordinateGrid, resource) { // endDate is exclusive
        if (refreshCoordinateGrid) {
            coordinateGrid.build();
        }
        var startCol, endCol;
        startCol = resourceCol(resource);
        endCol = startCol + 1;
        dayBind(renderCellOverlay(0, startCol, 0, endCol-1));
    }
	
	
    function renderCellOverlay(row0, col0, row1, col1) { // only for all-day?
        var rect = coordinateGrid.rect(row0, col0, row1, col1, slotLayer);
        return renderOverlay(rect, slotLayer);
    }
	

    function renderSlotOverlay(overlayStart, overlayEnd, resource) {
        var dayStart = cloneDate(t.visStart);
        var dayEnd = addDays(cloneDate(dayStart), 1);
        for (var i=0; i<colCnt; i++) {
            var stretchStart = new Date(Math.max(dayStart, overlayStart));
            var stretchEnd = new Date(Math.min(dayEnd, overlayEnd));
            if (stretchStart < stretchEnd) {
                //var col = i*dis+dit;
                var col = resourceCol(resource);
                var rect = coordinateGrid.rect(0, col, 0, col, slotContent); // only use it for horizontal coords
                var top = timePosition(dayStart, stretchStart);
                var bottom = timePosition(dayStart, stretchEnd);
                rect.top = top;
                rect.height = bottom - top;
                slotBind(
                    renderOverlay(rect, slotContent)
                    );
            }
            addDays(dayStart, 1);
            addDays(dayEnd, 1);
        }
    }
	
	
    
    /* Coordinate Utilities
	-----------------------------------------------------------------------------*/
	
	
    coordinateGrid = new CoordinateGrid(function(rows, cols) {
        var e, n, p;
        dayHeadCells.each(function(i, _e) {
            e = $(_e);
            n = e.offset().left;
            if (i) {
                p[1] = n;
            }
            p = [n];
            cols[i] = p;
        });
        p[1] = n + e.outerWidth();
        if (opt('allDaySlot')) {
            e = allDayRow;
            n = e.offset().top;
            rows[0] = [n, n+e.outerHeight()];
        }
        var slotTableTop = slotContent.offset().top;
        var slotScrollerTop = slotScroller.offset().top;
        var slotScrollerBottom = slotScrollerTop + slotScroller.outerHeight();
        function constrain(n) {
            return Math.max(slotScrollerTop, Math.min(slotScrollerBottom, n));
        }
        for (var i=0; i<slotCnt; i++) {
            rows.push([
                constrain(slotTableTop + slotHeight*i),
                constrain(slotTableTop + slotHeight*(i+1))
                ]);
        }
    });
	
	
    hoverListener = new HoverListener(coordinateGrid);
	
    
	colPositions = new HorizontalPositionCache(function(col) {
		return dayBodyCellInners.eq(col);
	});
    
	
    colContentPositions = new HorizontalPositionCache(function(col) {
        return dayBodyCellContentInners.eq(col);
    });
	
	
	function colLeft(col) {
		return colPositions.left(col);
	}


	function colContentLeft(col) {
		return colContentPositions.left(col);
	}


	function colRight(col) {
		return colPositions.right(col);
	}
	

    function colContentRight(col) {
        return colContentPositions.right(col);
    }
	
	
    function dateCell(date) { // "cell" terminology is now confusing
        return {
            row: Math.floor(dayDiff(date, t.visStart) / 7),
            col: dayOfWeekCol(date.getDay())
        };
    }
	
	
    function cellDate(cell) {
        var d = resourceDate(cell.col);
        var slotIndex = cell.row;
        if (opt('allDaySlot')) {
            slotIndex--;
        }
        if (slotIndex >= 0) {
            addMinutes(d, minMinute + slotIndex * opt('slotMinutes'));
        }
        return d;
    }
       
       
    function resourceDate(col) {
        return cloneDate(t.visStart);
    }
	
    
    function cellIsAllDay(cell) {
        return opt('allDaySlot') && !cell.row;
    }
	
    
    function dayOfWeekCol(dayOfWeek) {
        return 0;
    }
    
    /* return the column index the resource is at.  Return -1 if resource cannot be found. */
    function resourceCol(resource) {
        for (var i=0; i<resources.length; i++) {
            if (resource.id === resources[i].id)
                return i;
        }
        return -1;
    }
	
	
	
    // get the Y coordinate of the given time on the given day (both Date objects)
    function timePosition(day, time) { // both date objects. day holds 00:00 of current day
        day = cloneDate(day, true);
        if (time < addMinutes(cloneDate(day), minMinute)) {
            return 0;
        }
        if (time >= addMinutes(cloneDate(day), maxMinute)) {
            return slotTable.height();
        }
        var slotMinutes = opt('slotMinutes'),
        minutes = time.getHours()*60 + time.getMinutes() - minMinute,
        slotI = Math.floor(minutes / slotMinutes),
        slotTop = slotTopCache[slotI];
        if (slotTop === undefined) {
            slotTop = slotTopCache[slotI] = slotTable.find('tr:eq(' + slotI + ') td div')[0].offsetTop; //.position().top; // need this optimization???
        }
        return Math.max(0, Math.round(
            slotTop - 1 + slotHeight * ((minutes % slotMinutes) / slotMinutes)
            ));
    }
	
	
    function allDayBounds() {
        return {
            left: axisWidth,
            right: viewWidth - gutterWidth
        }
    }
	
	
    function getAllDayRow(index) {
        return allDayRow;
    }
	
	
    function defaultEventEnd(event) {
        var start = cloneDate(event.start);
        if (event.allDay) {
            return start;
        }
        return addMinutes(start, opt('defaultEventMinutes'));
    }
	
	
	
    /* Selection
	---------------------------------------------------------------------------------*/
	
	
    function defaultSelectionEnd(startDate, allDay) {
        if (allDay) {
            return cloneDate(startDate);
        }
        return addMinutes(cloneDate(startDate), opt('slotMinutes'));
    }
	
	
    function renderSelection(startDate, endDate, allDay, resource) { // only for all-day
        if (allDay) {
            if (opt('allDaySlot')) {
                renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true, resource);
            }
        }else{
            renderSlotSelection(startDate, endDate, resource);
        }
    }
	
	
    function renderSlotSelection(startDate, endDate, resource) {
        var helperOption = opt('selectHelper');
        coordinateGrid.build();
        if (helperOption) {
            var col = resourceCol(resource);
            if (col >= 0 && col < colCnt) { // only works when times are on same day
                var rect = coordinateGrid.rect(0, col, 0, col, slotContent); // only for horizontal coords
                var top = timePosition(startDate, startDate);
                var bottom = timePosition(startDate, endDate);
                if (bottom > top) { // protect against selections that are entirely before or after visible range
                    rect.top = top;
                    rect.height = bottom - top;
                    rect.left += 2;
                    rect.width -= 5;
                    if ($.isFunction(helperOption)) {
                        var helperRes = helperOption(startDate, endDate);
                        if (helperRes) {
                            rect.position = 'absolute';
                            rect.zIndex = 8;
                            selectionHelper = $(helperRes)
                            .css(rect)
                            .appendTo(slotContent);
                        }
                    }else{
                        rect.isStart = true; // conside rect a "seg" now
                        rect.isEnd = true;   //
                        selectionHelper = $(slotSegHtml(
                        {
                            title: '',
                            start: startDate,
                            end: endDate,
                            className: ['fc-select-helper'],
                            editable: false
                        },
                        rect
                        ));
                        selectionHelper.css('opacity', opt('dragOpacity'));
                    }
                    if (selectionHelper) {
                        slotBind(selectionHelper);
                        slotContent.append(selectionHelper);
                        setOuterWidth(selectionHelper, rect.width, true); // needs to be after appended
                        setOuterHeight(selectionHelper, rect.height, true);
                    }
                }
            }
        }else{
            renderSlotOverlay(startDate, endDate, resource);
        }
    }
	
	
    function clearSelection() {
        clearOverlays();
        if (selectionHelper) {
            selectionHelper.remove();
            selectionHelper = null;
        }
    }
    
    function daySelectionMousedown(ev) {
        var cellDate = t.cellDate;
        var cellIsAllDay = t.cellIsAllDay;
        var hoverListener = t.getHoverListener();
        if (ev.which == 1 && opt('selectable')) { // which==1 means left mouse button
            unselect(ev);
            var _mousedownElement = this;
            var dates;
            var resource;
            hoverListener.start(function(cell, origCell) { // TODO: maybe put cellDate/cellIsAllDay info in cell
                clearSelection();
                if (cell && cellIsAllDay(cell)) {
                    resource = resources[cell.col];
                    dates = [ cellDate(origCell), cellDate(cell) ].sort(dateCompare);
                    renderSelection(dates[0], dates[1], true, resource);
                }else{
                    dates = null;
                }
            }, ev);
            $(document).one('mouseup', function(ev) {
                hoverListener.stop();
                if (dates && resource) {
                    reportSelection(dates[0], dates[1], true, ev, resource.id);
                }
            });
        } else if (ev.which == 3 && opt('selectable')){
    		//@author paronne: SBAP-128/3 implement rightClickSelect and dayRightClick
    		//TODO hoverlistener is not needed, should get just a direct click
    		ev.preventDefault();
    		ev.stopImmediatePropagation();
    		var datesRightClick;
            var resource;
    		hoverListener.start(function(cell, origCell) {
    			clearSelection();
    		       if (cell && cellIsAllDay(cell)) {
                       resource = resources[cell.col];
                       datesRightClick = [ cellDate(origCell), cellDate(cell) ].sort(dateCompare);
                       renderSelection(datesRightClick[0], datesRightClick[1], true, resource);
                   }else{
                       dates = null;
                   }
    		}, ev);
    		$(document).one('mouseup', function(ev) {
    			hoverListener.stop();
    			if (datesRightClick) {
    				if (datesRightClick && resource) {
    					reportDayRightClick(datesRightClick[0], false, ev, resource.id);
    				}
    			}
    		});
    	}
    } 
	
	
    function slotSelectionMousedown(ev) {
        if (ev.which == 1 && opt('selectable')) { // ev.which==1 means left mouse button
            unselect(ev);
            var dates;
            var resource;
            hoverListener.start(function(cell, origCell) {
                clearSelection();
                if (cell && cell.col == origCell.col && !cellIsAllDay(cell)) {
                    resource = resources[cell.col];
                    var d1 = cellDate(origCell);
                    var d2 = cellDate(cell);
                    dates = [
                    d1,
                    addMinutes(cloneDate(d1), opt('slotMinutes')),
                    d2,
                    addMinutes(cloneDate(d2), opt('slotMinutes'))
                    ].sort(dateCompare);
                    renderSlotSelection(dates[0], dates[3], resource);
                }else{
                    dates = null;
                }
            }, ev);
            $(document).one('mouseup', function(ev) {
                hoverListener.stop();
                if (dates && resource) {
                    reportSelection(dates[0], dates[3], false, ev, resource.id);
                }
            });
        } else if (ev.which == 3 && opt('selectable')){
			//@author paronne: SBAP-128/3 implement rightClickSelect and dayRightClick
			//TODO hoverlistener is not needed, should get just a direct click
			ev.preventDefault();
			ev.stopImmediatePropagation();
			var datesRightClick;
            var resource;
			hoverListener.start(function(cell, origCell) {
				clearSelection();
				if (cell && cell.col == origCell.col && !cellIsAllDay(cell)) {
                    resource = resources[cell.col];
					var d1 = cellDate(origCell);
					var d2 = cellDate(cell);
					datesRightClick = [
						d1,
						addMinutes(cloneDate(d1), opt('slotMinutes')), // calculate minutes depending on selection slot minutes 
						d2,
						addMinutes(cloneDate(d2), opt('slotMinutes'))
					].sort(dateCompare);
				}else{
					dates = null;
				}
			}, ev);
			$(document).one('mouseup', function(ev) {
				hoverListener.stop();
				if (datesRightClick) {
					if (datesRightClick && resource) {
						reportDayRightClick(datesRightClick[0], false, ev, resource.id);
					}
				}
			});
		}
    }
	
	
    function reportDayClick(date, allDay, ev) {
        trigger('dayClick', dayBodyCells[dayOfWeekCol(date.getDay())], date, allDay, ev);
    }
	
    
	//@author paronne: SBAP-128/3 implement rightClick
	function reportDayRightClick(date, allDay, ev, resourceId) {
		trigger('dayRightClick', dayBodyCells[dayOfWeekCol(date.getDay())], date, allDay, ev, resourceId);
	}
	
	
    /* External Dragging
	--------------------------------------------------------------------------------*/
	
	
    function dragStart(_dragElement, ev, ui) {
        hoverListener.start(function(cell) {
            clearOverlays();
            if (cell) {
                if (cellIsAllDay(cell)) {
                    renderCellOverlay(cell.row, cell.col, cell.row, cell.col);
                }else{
                    var d1 = cellDate(cell);
                    var d2 = addMinutes(cloneDate(d1), opt('defaultEventMinutes'));
                    renderSlotOverlay(d1, d2);
                }
            }
        }, ev);
    }
	
	
    function dragStop(_dragElement, ev, ui) {
        var cell = hoverListener.stop();
        clearOverlays();
        if (cell) {
            trigger('drop', _dragElement, cellDate(cell), cellIsAllDay(cell), ev, ui);
        }
    }
    
    /* Render annotations
	-----------------------------------------------------------------------------*/
		function renderAnnotations(annotations) {
		var html = '';
		//for each annotation
		for (var i=0; i < annotations.length; i++) {
			var ann = annotations[i];
			//only if annotation between start and end of visualization
			var isRecurring = ann.recurring ? true : false;
			var nextStart = new Date(ann.start)
			var nextEnd = new Date(ann.end);
			//TODO review condition
			if(isRecurring || nextStart >= this.start && nextEnd <= this.end){
				do {

					var top = timePosition(nextStart, nextStart);
					var bottom = timePosition(nextEnd, nextEnd);
					var height = bottom - top;
					var dayIndex = dayDiff(nextStart, t.visStart);
					var width;
					
					//TODO review condition
					// start should not be an hidden day
					// this.start <= start < this.end
					// get the column based on the day
					// for semplicity end<this.end
					if(!t.isHiddenDay(nextStart) && nextStart >= this.start && nextStart < this.end && nextEnd <= this.end){
						try {
							var cnt = t.getColCnt()
							var left = colContentLeft(0) - 2;
							var right = colContentRight(cnt - 1) + 3;
							width = right - left;
						} catch (e){
							width = 0;
						}
					} else {
						width = 0
					}
					
//					//TODO remove this code (what if a day is missing)
//					if(dayIndex >= 0){
//						try {
//							var left = colContentLeft(dayIndex) - 2;
//							var right = colContentRight(dayIndex) + 3;
//							width = right - left;
//						} catch (e){
//							width = 0;
//						}
//					} else {
//						width = 0;
//					}
	
					var cls = '';
					if (ann.cls) {
						cls = ' ' + ann.cls;
					}
	
					var colors = '';
					if (ann.color) {
						colors = 'color:' + ann.color + ';';
					}
					if (ann.background) {
						colors += 'background:' + ann.background + ';';
					}
	
					var body = ann.title || '';
	
					if(width){
						html += '<div style="position: absolute; ' + 
							'top: ' + top + 'px; ' + 
							'left: ' + left + 'px; ' +
							'width: ' + width + 'px; ' +
							'height: ' + height + 'px;' + colors + '" ' + 
							'class="fc-annotation fc-annotation-skin' + cls + '">' + 
							body + 
							'</div>';		
					}	
					if(isRecurring);
					{
						//if the view start in a date > then recurring annotation starting date, move to first recurring date of the view.
						if((nextStart < this.start)){  //TODO && nextStart < this.end
							//how Many days from the last event
							var timeInterval = dayDiff(this.start, nextStart);
							var recurrences = Math.floor(timeInterval/ann.recurring)
							nextStart = addDays(nextStart, ann.recurring*recurrences, true);					
							nextEnd = addDays(nextEnd, ann.recurring*recurrences, true);
							if(nextStart < this.start){
								nextStart = addDays(nextStart, ann.recurring, true);
								nextEnd = addDays(nextEnd, ann.recurring, true);
							}
						} else {
							nextStart = addDays(nextStart, ann.recurring, true);
							nextEnd = addDays(nextEnd, ann.recurring, true);
						}
					}
					//TODO review condition
				} while (isRecurring && nextStart >= this.start && nextEnd <= this.end)
			} 
		}
		annotationSegmentContainer[0].innerHTML = html;				
	}

}
