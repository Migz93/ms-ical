import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

function CalendarView() {
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        // Load calendars and selection in parallel
        const [calendarsRes, selectionRes] = await Promise.all([
          fetch('/api/calendars'),
          fetch('/api/calendars/selection')
        ]);

        if (!calendarsRes.ok) throw new Error('Failed to load calendars');
        const calendarsData = await calendarsRes.json();
        setCalendars(calendarsData);

        if (selectionRes.ok) {
          const selectionData = await selectionRes.json();
          setSelectedCalendars(selectionData);
          
          // Load events if there are selected calendars
          if (selectionData.length > 0) {
            await loadEventsForCalendars(selectionData);
          }
        } else {
          setSelectedCalendars([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedCalendars.length > 0 && !loading) {
      loadEvents();
    }
  }, [selectedCalendars]);

  async function loadEventsForCalendars(calendarIds) {
    try {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(now);
      end.setMonth(end.getMonth() + 2);

      const calIds = calendarIds.join(',');
      const res = await fetch(
        `/api/events?from=${start.toISOString()}&to=${end.toISOString()}&calIds=${calIds}`
      );
      
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();

      const formattedEvents = data.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.isAllDay,
        extendedProps: {
          location: event.location,
          calendarId: event.calendarId
        }
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }

  async function loadEvents() {
    try {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(now);
      end.setMonth(end.getMonth() + 2);

      const calIds = selectedCalendars.join(',');
      const res = await fetch(
        `/api/events?from=${start.toISOString()}&to=${end.toISOString()}&calIds=${calIds}`
      );
      
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();

      const formattedEvents = data.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.isAllDay,
        extendedProps: {
          location: event.location,
          calendarId: event.calendarId
        }
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }

  async function toggleCalendar(calId) {
    const newSelection = selectedCalendars.includes(calId)
      ? selectedCalendars.filter(id => id !== calId)
      : [...selectedCalendars, calId];

    setSelectedCalendars(newSelection);

    try {
      await fetch('/api/calendars/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarIds: newSelection })
      });
    } catch (err) {
      console.error('Error saving selection:', err);
    }
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-red-500 mt-2">
          Please check your settings and ensure you're authenticated.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left sidebar - Calendar selection */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-4 sticky top-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-100">Select Calendars</h2>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading calendars...</div>
          ) : calendars.length === 0 ? (
            <div className="text-gray-400 text-sm">No calendars found</div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {calendars.map(cal => (
                <label key={cal.id} className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCalendars.includes(cal.id)}
                    onChange={() => toggleCalendar(cal.id)}
                    className="mt-0.5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-200 leading-tight">
                    {cal.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Calendar view */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-6 flex items-center justify-center h-96">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : selectedCalendars.length === 0 ? (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-400">
              Select one or more calendars {calendars.length > 0 ? 'on the left' : ''} to view events
            </p>
          </div>
        ) : (
          <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={events}
              height="auto"
              eventClick={(info) => {
                alert(`Event: ${info.event.title}\nLocation: ${info.event.extendedProps.location || 'N/A'}`);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarView;
