
function BasicEventRenderer() {
	var t = this;
	
	
	// exports
	t.renderEvents = renderEvents;
	t.clearEvents = clearEvents;
	

	// imports
	DayEventRenderer.call(t);

	
	function renderEvents(events, modifiedEventId) {
//TODO merge
//<<<<<<< master-servoy
		t.renderDayEvents(events, modifiedEventId);
//=======
//		reportEvents(events);
//		renderDaySegs(compileSegs(events), modifiedEventId);
//		trigger('eventAfterAllRender');
//>>>>>>> 9aafd21 version 1.6.1.1 (5/11/13) - Merged with latest Fullcalendar version 1.6.1 - Fixed issue #29 Resize does not work when event is 1 day and weekends off - Fixed issue #24 single all-day events do not display in resource day view
	}
	
	
	function clearEvents() {
		t.getDaySegmentContainer().empty();
	}


	// TODO: have this class (and AgendaEventRenderer) be responsible for creating the event container div

}
