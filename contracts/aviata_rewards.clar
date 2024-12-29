;; Aviata Rewards Token Contract

;; Define token
(define-fungible-token aviata-miles)

;; Constants 
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-insufficient-balance (err u101))
(define-constant err-invalid-miles (err u102))
(define-constant err-invalid-status (err u103))

;; Status level thresholds
(define-constant silver-threshold u25000)
(define-constant gold-threshold u50000)
(define-constant platinum-threshold u100000)

;; Data vars
(define-data-var token-name (string-ascii 32) "Aviata Miles")
(define-data-var token-symbol (string-ascii 10) "AVML")

;; Data maps
(define-map user-status 
    principal 
    {
        lifetime-miles: uint,
        status-level: (string-ascii 10)
    }
)

;; Private functions
(define-private (calculate-status (miles uint))
    (if (>= miles platinum-threshold)
        "PLATINUM"
        (if (>= miles gold-threshold)
            "GOLD"
            (if (>= miles silver-threshold)
                "SILVER"
                "BASIC"
            )
        )
    )
)

;; Public functions
(define-public (register-user)
    (begin
        (map-set user-status tx-sender {
            lifetime-miles: u0,
            status-level: "BASIC"
        })
        (ok true)
    )
)

(define-public (earn-miles (flight-miles uint))
    (let (
        (current-stats (unwrap! (map-get? user-status tx-sender) (err u104)))
        (new-lifetime-miles (+ flight-miles (get lifetime-miles current-stats)))
    )
    (begin
        (try! (ft-mint? aviata-miles flight-miles tx-sender))
        (map-set user-status tx-sender {
            lifetime-miles: new-lifetime-miles,
            status-level: (calculate-status new-lifetime-miles)
        })
        (ok true)
    ))
)

(define-public (transfer-miles (amount uint) (sender principal) (recipient principal))
    (let (
        (sender-balance (ft-get-balance aviata-miles sender))
    )
    (if (>= sender-balance amount)
        (begin
            (try! (ft-transfer? aviata-miles amount sender recipient))
            (ok true)
        )
        err-insufficient-balance
    ))
)

(define-public (redeem-reward (miles-cost uint))
    (let (
        (user-balance (ft-get-balance aviata-miles tx-sender))
    )
    (if (>= user-balance miles-cost)
        (begin
            (try! (ft-burn? aviata-miles miles-cost tx-sender))
            (ok true)
        )
        err-insufficient-balance
    ))
)

;; Read only functions
(define-read-only (get-name)
    (ok (var-get token-name))
)

(define-read-only (get-symbol)
    (ok (var-get token-symbol))
)

(define-read-only (get-balance (account principal))
    (ok (ft-get-balance aviata-miles account))
)

(define-read-only (get-user-status (user principal))
    (ok (map-get? user-status user))
)