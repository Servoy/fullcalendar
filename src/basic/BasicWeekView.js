
fcViews.basicWeek = BasicWeekView;

function BasicWeekView(element, calendar) {
	var t = this;
	
	
	// exports
	t.render = render;
	
	
	// imports
	BasicView.call(t, element, calendar, 'basicWeek');
	var opt = t.opt;
	var renderBasic = t.renderBasic;
	var skipHiddenDays = t.skipHiddenDays;
	var getCellsPerWeek = t.getCellsPerWeek;
	var formatDates = calendar.formatDates;
	
	
	function render(date, delta) {

		if (delta) {
			addDays(date, delta * 7);
		}

		var start = addDays(cloneDate(date), -((date.getDay() - opt('firstDay') + 7) % 7));
		var end = addDays(cloneDate(start), 7);

		var visStart = cloneDate(start);
		skipHiddenDays(visStart);

		var visEnd = cloneDate(end);
		skipHiddenDays(visEnd, -1, true);

		var colCnt = getCellsPerWeek();

		t.start = start;
		t.end = end;
		t.visStart = visStart;
		t.visEnd = visEnd;

		t.title = formatDates(
			visStart,
			addDays(cloneDate(visEnd), -1),
			opt('titleFormat')
		);
//TODO merge:
//<<<<<<< master-servoy

		renderBasic(1, colCnt, false);
//=======
//		t.start = start;
//		t.end = end;
//		t.visStart = visStart;
//		t.visEnd = visEnd;
//		renderBasic(1, weekends ? 7 : 5, false);
//>>>>>>> 9aafd21 version 1.6.1.1 (5/11/13) - Merged with latest Fullcalendar version 1.6.1 - Fixed issue #29 Resize does not work when event is 1 day and weekends off - Fixed issue #24 single all-day events do not display in resource day view
	}
	
	
}
