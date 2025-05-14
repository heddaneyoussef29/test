-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 07, 2025 at 02:42 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `crypto`
--

-- --------------------------------------------------------

--
-- Table structure for table `cryptocurrencies`
--

CREATE TABLE `cryptocurrencies` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `symbol` varchar(10) NOT NULL,
  `current_price` decimal(18,8) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `price_change_percentage_24h` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cryptocurrencies`
--

INSERT INTO `cryptocurrencies` (`id`, `name`, `symbol`, `current_price`, `image_url`, `last_updated`, `price_change_percentage_24h`) VALUES
('bitcoin', 'Bitcoin', 'BTC', 50000.00000000, 'https://cdn-icons-png.flaticon.com/128/5968/5968260.png', '2025-05-05 15:21:01', 8),
('cardano', 'Cardano', 'ADA', 1.50000000, 'https://cdn-icons-png.flaticon.com/128/14446/14446140.png', '2025-05-05 15:21:01', 0),
('ethereum', 'Ethereum', 'ETH', 3000.00000000, 'https://cdn-icons-png.flaticon.com/128/14279/14279770.png', '2025-05-05 15:21:01', 0),
('ripple', 'Ripple', 'XRP', 0.75000000, 'https://cdn-icons-png.flaticon.com/128/1490/1490820.png', '2025-05-05 15:30:26', 0),
('solana', 'Solana', 'SOL', 150.00000000, 'https://cdn-icons-png.flaticon.com/128/6001/6001527.png', '2025-05-05 15:30:26', 0),
('usd', 'usd', 'usd', 1.00000000, 'https://cdn-icons-png.flaticon.com/128/15301/15301840.png', '2025-05-06 00:39:32', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cryptocurrencies`
--
ALTER TABLE `cryptocurrencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `symbol` (`symbol`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
