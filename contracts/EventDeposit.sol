// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EventDeposit
 * @dev Simple contract for event deposits - users deposit 1 DOT, redeem at venue
 * @notice Two functions: deposit() and redeem() - anyone can call redeem after deadline
 */
contract EventDeposit {
    // State variables
    address public admin;
    uint256 public constant DEPOSIT_AMOUNT = 1 ether; // 1 DOT in wei
    uint256 public immutable REDEMPTION_DEADLINE; // Redemption deadline timestamp

    // Array to keep track of all depositors
    address[] public depositors;

    // Events
    event DepositMade(address indexed user, uint256 amount, uint256 timestamp);
    event DepositRedeemed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event AdminWithdrawal(
        address indexed admin,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Constructor sets the admin address and redemption deadline
     * @param _admin Address of the contract administrator
     * @param _redemptionDeadline Timestamp when redemption period ends
     */
    constructor(address _admin, uint256 _redemptionDeadline) {
        require(_admin != address(0), "Admin address cannot be zero");
        require(
            _redemptionDeadline > block.timestamp,
            "Redemption deadline must be in the future"
        );
        admin = _admin;
        REDEMPTION_DEADLINE = _redemptionDeadline;
    }

    /**
     * @dev Function for users to make a deposit
     * @notice Users must send exactly 1 DOT to register for the event
     */
    function deposit() external payable {
        require(msg.value == DEPOSIT_AMOUNT, "Must send exactly 1 DOT");
        require(!_hasDeposited(msg.sender), "User has already deposited");
        require(
            block.timestamp < REDEMPTION_DEADLINE,
            "Deposit period has ended"
        );

        depositors.push(msg.sender);

        emit DepositMade(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Redeem function - anyone can call this
     * @notice Before deadline: user gets their deposit back. After deadline: all funds go to admin
     */
    function redeem() external {
        if (block.timestamp < REDEMPTION_DEADLINE) {
            // Before deadline - user must have deposited to redeem
            require(
                _hasDeposited(msg.sender),
                "No deposit found for this address"
            );

            // Remove user from list and return their deposit
            _removeDepositor(msg.sender);

            (bool success, ) = payable(msg.sender).call{value: DEPOSIT_AMOUNT}(
                ""
            );
            require(success, "Failed to send deposit back to user");

            emit DepositRedeemed(msg.sender, DEPOSIT_AMOUNT, block.timestamp);
        } else {
            // After deadline - anyone can trigger admin withdrawal
            uint256 contractBalance = address(this).balance;
            require(contractBalance > 0, "No funds to withdraw");

            // Clear all depositors and send all funds to admin
            delete depositors;

            (bool success, ) = payable(admin).call{value: contractBalance}("");
            require(success, "Failed to send funds to admin");

            emit AdminWithdrawal(admin, contractBalance, block.timestamp);
        }
    }

    /**
     * @dev Check if a user has made a deposit
     * @param _user Address to check
     * @return True if the user has made a deposit
     */
    function hasDeposited(address _user) external view returns (bool) {
        return _hasDeposited(_user);
    }

    /**
     * @dev Internal function to remove a depositor from the array
     * @param _depositor Address to remove from depositors array
     */
    function _removeDepositor(address _depositor) internal {
        for (uint256 i = 0; i < depositors.length; i++) {
            if (depositors[i] == _depositor) {
                depositors[i] = depositors[depositors.length - 1];
                depositors.pop();
                break;
            }
        }
    }

    /**
     * @dev Internal function to check if an address has deposited
     * @param _user Address to check
     * @return True if the address is in the depositors list
     */
    function _hasDeposited(address _user) internal view returns (bool) {
        for (uint256 i = 0; i < depositors.length; i++) {
            if (depositors[i] == _user) {
                return true;
            }
        }
        return false;
    }
}
