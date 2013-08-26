
fcViews.basicDay = BasicDayView;


function BasicDayView(element, calendar) {
	var t = this;
	
	
	// exports
	t.render = render;
	
	
	// imports
	BasicView.call(t, element, calendar, 'basicDay');
	var opt = t.opt;
	var renderBasic = t.renderBasic;
	var skipHiddenDays = t.skipHiddenDays;
	var formatDate = calendar.formatDate;
	
	
	function render(date, delta) {

		if (delta) {
			addDays(date, delta);
		}
		skipHiddenDays(date, delta < 0 ? -1 : 1);

		var start = cloneDate(date, true);
		var end = addDays(cloneDate(start), 1);

		t.title = formatDate(date, opt('titleFormat'));
//TODO merge
//<<<<<<< master-servoy

		t.start = t.visStart = start;
		t.end = t.visEnd = end;

//=======
//		t.start = t.visStart = cloneDate(date, true);
//		t.end = t.visEnd = addDays(cloneDate(t.start), 1);
//>>>>>>> 9aafd21 version 1.6.1.1 (5/11/13) - Merged with latest Fullcalendar version 1.6.1 - Fixed issue #29 Resize does not work when event is 1 day and weekends off - Fixed issue #24 single all-day events do not display in resource day view
		renderBasic(1, 1, false);
	}
	
	
}
