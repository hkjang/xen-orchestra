<?php
/**
 * This file is a part of Xen Orchestra Server.
 *
 * Xen Orchestra Server is free software: you can redistribute it
 * and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * Xen Orchestra Server is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty
 * of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Xen Orchestra Server. If not, see
 * <http://www.gnu.org/licenses/>.
 *
 * @author Julien Fontanet <julien.fontanet@vates.fr>
 * @license http://www.gnu.org/licenses/gpl-3.0-standalone.html GPLv3
 *
 * @package Xen Orchestra Server
 */

namespace Manager;

/**
 *
 */
abstract class XCPAbstract extends ManagerAbstract
{
	/**
	 *
	 */
	function batchImport(array $objects)
	{
		foreach ($objects as $id => $properties)
		{
			$properties['id'] = $id;
			unset($properties['uuid']);

			$n = $this->_database->update(
				$this->_table,
				array('id' => $id),
				$properties
			);

			if (1 === $n)
			{
				echo $this->_table.': updated ('.$id.')', PHP_EOL;
			}
			elseif (0 === $n)
			{
				$this->_database->create(
					$this->_table,
					array($properties)
				);

				echo $this->_table.': new ('.$id.')', PHP_EOL;
			}
			else
			{
				trigger_error(
					'unexpected number of updated '.$this->_table.' ('.$n.')',
					E_USER_ERROR
				);
			}
		}
	}
}
