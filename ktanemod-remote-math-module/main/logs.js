window.onpopstate = function(e) {
  runStartUp()
}

function runStartUp() {
  $('#logoutput-area').stop().slideUp(500)
  $('#fileoutput-area').stop().slideUp(500)
  var query = new URLSearchParams(location.search)
  if (query.get('q') != null) {
    var a = query.get('q')
    var s = a.split('/')
    if(s.length<4) return alert("Invalid param log")
    $('#input-year').val(s[0] == '*' ? '' : s[0])
    $('#input-month').val(s[1]) // Requires * as option value is *
    $('#input-day').val(s[2] == '*' ? '' : s[2])
    $('#input-code').val(s[3] == '*' ? '' : s[3])
    if (s.length == 5) {
      openLogFile(a)
    } else if (s.length == 4) {
      runSearch(s[0],s[1],s[2],s[3])
    }
  }
}

$(document).ready(function () {
  $('#logoutput-area').slideUp(0)
  $('#fileoutput-area').slideUp(0)
  runStartUp()
  $('#search-logs').click(function () {
    var yearField = $('#input-year').val()
    var monthField = $('#input-month').val()
    var dayField = $('#input-day').val()
    var codeField = $('#input-code').val()
    if (yearField == '') yearField = '*'
    if (monthField == '') monthField = '*'
    if (dayField == '') dayField = '*'
    if (codeField == '') codeField = '*'
    history.pushState({}, '', `/logs/?q=${yearField}/${monthField}/${dayField}/${codeField}`)
    runSearch(yearField, monthField, dayField, codeField)
  })
  $('body').on('click', '.fileoutput-hotlink', function (e) {
    e.preventDefault()
    var a = $(this).attr('address')
    history.pushState({}, '', `/logs/?q=${a}`)
    openLogFile(a)
  })
})

function renderPage(x) {
  $('#logoutput-area').stop().slideUp(500)
  $('#fileoutput-area').stop().slideDown(500)
  $('#fileoutput-area').html(x.length == 0 ? '<li>No logs found matching the search parameters.</li>' : '')
  for (var i = 0; i < x.length; i++) {
    var n = x[i].replace(/^([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2})\/([A-Z]{6})\/([A-Z0-9]{8})$/, '$4 on $3/$2/$1 ($5)')
    $('#fileoutput-area').append(`<li><a class="fileoutput-hotlink" href="#log" address="${x[i]}">${n}</a></li>`)
  }
}

function renderLog(x) {
  $('#logoutput-area').text(x)
  $('#logoutput-area').stop().slideDown(500)
  $('#fileoutput-area').stop().slideUp(500)
}

function openLogFile(a) {
  $.ajax({
    method: 'GET',
    cache: false,
    url: `/logs/api/${a}`,
    success: function (d) {
      renderLog(d)
    },
    error: function (err) {
      console.error(err)
      alert('There was an error downloading the log file.\nPlease check that you have ended the bomb first.')
    },
  })
}

function runSearch(yearField, monthField, dayField, codeField) {
  $.ajax({
    method: 'GET',
    cache: false,
    url: `/logs/api/${yearField}/${monthField}/${dayField}/${codeField}`,
    success: function (d) {
      if(typeof d === "string") {
        try {
          renderPage(JSON.parse(d))
        } catch (err) {
          console.error(err)
          alert("Invalid search result")
        }
      } else {
        renderPage(d)
      }
    },
    error: function (err) {
      console.error(err)
      alert('There was an error searching for the log file')
    },
  })
}
