const $ = {
  booking_modal: '.booking-modal',
  btn_trigger_default: 'a[data-trigger="booking-modal"][href="/closet-concierge/book"]',
  btn_trigger_curation: 'a[data-trigger="booking-modal"][href="/closet-concierge/book#curation"]',
  btn_trigger_styling: 'a[data-trigger="booking-modal"][href="/closet-concierge/book#styling"]',
  btn_continue: '.booking-modal button[data-nav="next"]',
  btn_continue_signup_success: '[data-page="SIGNUP_SUCCESS"] a[href="/"]',
  page_email_zip: '.booking-modal [data-page="APPT_EMAIL_ZIP"]',
  page_email_zip_appt_type: '.booking-modal [data-page="APPT_EMAIL_ZIP"] label[data-block="appt-type"]',
  page_email_zip_errors: '[data-page="APPT_EMAIL_ZIP"] .form-field__error',
  page_signup_confirm: '[data-page="SIGNUP_CONFIRM"]',
  page_signup_success: '[data-page="SIGNUP_SUCCESS"]',
  page_appt_success: '[data-page="APPT_SUCCESS"]',
}

const XHR_URL_SUBMIT = '/api/concierge/ajax-concierge-booking'
const XHR_URL_WAITLIST = '/api/concierge/ajax-concierge-waitlist'

const aliasXhr = (alias, route, method = 'GET') => {
  cy.server()
  cy.route(method, route).as(alias)
}

// ----- HELPERS -----

function navigateToConcierge() {
  cy.visit('https://dev.tradesy.com/closet-concierge/')
}

function launchBookingModal(selector = 'a[data-trigger="booking-modal"][href="/closet-concierge/book"]') {
  navigateToConcierge()
  cy.get(selector).click()
}

function clickContinue(selector = '.booking-modal button[data-nav="next"]') {
  cy.get(selector).click()
}

function aliasXhrSubmit(url = XHR_URL_SUBMIT) {
  aliasXhr('submit', url, 'POST')
}

function fillFormAndContinue(data) {
  Object.keys(data).forEach(name => {
    const val = data[name]

    switch(name) {
      case 'appointment_type':
      case 'days':
      case 'times':
        cy.get(`input[name='${name}']`).check(val)
        break

      default:
        cy.get(`input[name='${name}']`).first().clear().type(val)
    }
  })

  clickContinue()
}


// ----- TESTS -----

describe('Concierge Tests', () => {
  it('opens Booking Modal when default CTA clicked', () => {
    navigateToConcierge()
    cy.title().should('include', 'Tradesy Closet Concierge')
    cy.get($.booking_modal).should('not.exist')
    cy.get($.btn_trigger_default).click()
    cy.get($.booking_modal).should('exist')
    cy.get($.page_email_zip).should('be.visible')
    cy.get($.page_email_zip_appt_type).should('not.have.text')
  })

  it('opens Booking Modal pre-filled when Curation CTA clicked', () => {
    launchBookingModal($.btn_trigger_curation)
    cy.get($.page_email_zip_appt_type).should('have.text', 'Appointment Type: Curation')
  })

  it('opens Booking Modal pre-filled when Styling CTA clicked', () => {
    launchBookingModal($.btn_trigger_styling)
    cy.get($.page_email_zip_appt_type).should('have.text', 'Appointment Type: Closet Styling')
  })

  it('validates Booking Modal form fields (smoke check first page)', () => {
    aliasXhrSubmit()
    launchBookingModal()
    clickContinue()
    cy.wait('@submit').then(xhr => {
      const errorElems = cy.get($.page_email_zip_errors)
      errorElems.should('contain', 'Your email is invalid.')
      errorElems.should('contain', 'Please enter a valid zip code.')
    })
  })

  it('completes Waitlist Signup path', () => {
    launchBookingModal()
    cy.get($.page_signup_confirm).should('not.exist')

    aliasXhrSubmit()
    fillFormAndContinue({ email: "test@tradesy.com", zip: "90405" })
    cy.wait('@submit').then(xhr => {
      // redirects to signup flow
      cy.get($.page_signup_confirm).should('be.visible')

      // submit signup, assert success page
      aliasXhrSubmit(XHR_URL_WAITLIST)
      clickContinue()
      cy.wait('@submit').then(xhr => {
        cy.get($.page_signup_success).should('be.visible')

        // click "Shop Tradesy" to continue, assert modal closed
        clickContinue($.btn_continue_signup_success)
        cy.get($.booking_modal).should('not.exist')
      })
    })
  })

  it('completes registration "Happy Path"', () => {
    launchBookingModal()
    aliasXhrSubmit()

    fillFormAndContinue({ email: "test@tradesy.com", zip: "10001" })
    cy.wait('@submit').then(xhr => {
      fillFormAndContinue({ appointment_type: "curation" })

      cy.wait('@submit').then(xhr => {
        fillFormAndContinue({ days: "weekdays", times: "afternoon" })

        cy.wait('@submit').then(xhr => {
          fillFormAndContinue({ name: "Jane Smith", phone: "(310) 111-2222" })

          cy.wait('@submit').then(xhr => {
            fillFormAndContinue({ street1: "100 Broadway", city: "New York" })

            cy.wait('@submit').then(xhr => {
              // assert success page?
              cy.get($.page_appt_success).should('be.visible')

              // click continue, assert modal closed
              clickContinue()
              cy.get($.booking_modal).should('not.exist')
            })
          })
        })
      })
    })
  })

})
